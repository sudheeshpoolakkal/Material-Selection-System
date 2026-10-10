const { test } = require('node:test');
const assert = require('node:assert/strict');
const enabled = process.env.RUN_MYSQL_TESTS === 'true';
test('real MySQL catalog: imported data, pagination, provenance, constraints and stable reimports', {skip: !enabled}, async () => {
  require('dotenv').config({path:require('node:path').join(__dirname,'../.env'),quiet:true});
  process.env.USE_SQLITE = 'false';
  const db = require('../config/db');
  const catalog = require('../services/catalog');
  const { recommendCatalog } = require('../services/catalogRecommendation');
  const { importBundle } = require('../scripts/import-catalog');
  const fs = require('node:fs');
  let listener;
  try {
    const summary = await catalog.getSummary();
    assert.equal(summary.database, 'mysql');
    const engineering = summary.sources.filter(s=>s.dataKind==='literature-extracted').reduce((sum,s)=>sum+s.count,0);
    assert.equal(summary.total, summary.sources.reduce((a,s)=>a+s.count,0));
    assert.equal(summary.sources.find(s=>s.sourceKey==='nist-jarvis-elastic').count, 19335);
    assert.equal(summary.sources.find(s=>s.sourceKey==='borg-mpea').count, 1545);
    assert.equal((await catalog.listMaterials({property:'tensileStrength',source:'borg-mpea'})).total, 303);
    assert.ok(summary.coverage.find(p=>p.propertyKey==='tensileStrength').count >= 303);
    assert.ok(summary.coverage.find(p=>p.propertyKey==='testTemperature').count > 1000);
    const first = await catalog.listMaterials({page:1,limit:24,source:'nist-jarvis-elastic'});
    const second = await catalog.listMaterials({page:2,limit:24,source:'nist-jarvis-elastic'});
    assert.equal(first.materials.length,24);
    assert.ok(second.materials.every(m=>!first.materials.some(a=>a.id===m.id)));
    assert.equal(first.total,19335);
    assert.equal((await catalog.listMaterials({source:"material-registry",q:"%' OR 1=1 --"})).total,0);
    const percent=await catalog.listMaterials({source:'material-registry',q:'%',limit:100});
    assert.ok(percent.materials.every(m=>`${m.name} ${m.externalId} ${m.description} ${(m.metadata?.searchAliases || []).join(' ')}`.includes('%')));
    assert.equal((await catalog.listMaterials({q:'%',source:'nist-jarvis-elastic'})).total,0);
    assert.equal((await catalog.listMaterials({limit:100000})).limit,100);
    const supplierSources = summary.sources.filter(s=>s.sourceKey.startsWith('outokumpu-'));
    if (supplierSources.length) {
      const grades = {materials:(await Promise.all(supplierSources.map(s=>catalog.listMaterials({source:s.sourceKey,property:'thermalConductivity',limit:100})))).flatMap(p=>p.materials)};
      assert.equal(grades.materials.length,81);
      assert.ok(grades.materials.every(m=>m.dataKind==='literature-extracted' && m.properties.density>0 && m.properties.tensileStrength>0 && m.properties.thermalConductivity>0));
      const cold=grades.materials.find(m=>m.externalId==='core-304-4301-c');
      assert.equal(cold.properties.tensileStrength,540);
      assert.equal(cold.metadata.propertyBounds.tensileStrength.max,750);
      assert.equal(cold.metadata.propertyCitations.thermalConductivity.page,10);
    }
    if (summary.sources.some(s=>s.sourceKey==='material-registry')) {
      const registry = await catalog.listMaterials({source:'material-registry',limit:100});
      assert.equal(registry.total,702);
      assert.equal((await catalog.listMaterials({source:'material-registry',property:'density'})).total,702);
      assert.equal((await catalog.listMaterials({source:'material-registry',property:'tensileStrength'})).total,599);
      assert.equal((await catalog.listMaterials({source:'material-registry',property:'thermalConductivity'})).total,26);
      for(const q of ['1.4301','SUS304','S30400']) {
        const results=await catalog.listMaterials({source:'material-registry',q});
        const steel=results.materials.find(m=>m.metadata.registrySlug==='stainless-steel-304');
        assert.ok(steel,`Grade lookup ${q}`);
        assert.equal(steel.properties.density,7.93);
        assert.equal(steel.properties.hardnessBrinell,201);
        assert.equal(steel.properties.hardnessVickers,undefined);
        assert.equal(steel.properties.elongation,undefined);
        assert.equal(steel.properties.elongationUnspecified,40);
        assert.ok((await recommendCatalog({keyword:q})).materials.some(m=>m.id===steel.id));
      }
      const polymers=await catalog.listMaterials({source:'material-registry',category:'Polymer',limit:100});
      assert.equal(polymers.total,71);
      assert.ok(polymers.materials.some(m=>m.properties.meltingPoint!=null));
      assert.ok(polymers.materials.every(m=>m.properties.maxServiceTemp===undefined));
      const before=registry.materials.map(m=>m.id);
      await importBundle(JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/downloads/material-registry/catalog.json'),'utf8')));
      assert.deepEqual((await catalog.listMaterials({source:'material-registry',limit:100})).materials.map(m=>m.id),before);
      assert.equal((await catalog.getSummary()).total,summary.total);
    }
    const ids=first.materials.map(m=>m.id);
    for (const m of first.materials) {
      assert.equal(m.dataKind,'computed');
      assert.equal(m.properties.tensileStrength,undefined);
      assert.equal(m.properties.density,undefined);
      assert.match(m.sourceUrl,/https:\/\/jarvis.nist.gov\/jarvisdft\/JVASP-/);
      assert.ok(Object.values(m.metadata.propertyBasis).every(v=>v==='computed'));
    }
    const tensile = await recommendCatalog({minTensileStrength:250,weights:{strength:100,lightness:0,cost:0,thermal:0,stiffness:0}});
    assert.ok(tensile.count>0);
    assert.ok(tensile.materials.every(m=>['experimental','literature-extracted'].includes(m.dataKind) && (m.metadata.testType==='T' || m.metadata.registrySlug || m.source==='NASA TPSX thermal protection materials')));
    const stiffness = await recommendCatalog({dataKind:'computed',minBulkModulus:100,weights:{strength:0,lightness:0,cost:0,thermal:0,stiffness:100}});
    assert.ok(stiffness.count>1000);
    assert.ok(stiffness.materials.every(m=>m.properties.bulkModulus>=100 && Number.isFinite(m.score)));
    assert.ok((await recommendCatalog({dataKind:'computed',volume:100,maxWeight:1})).materials.every(m=>m.estimatedMass<=1));
    assert.equal((await recommendCatalog({maxCost:'Low'})).count,0);
    assert.equal((await recommendCatalog({minServiceTemp:20})).count,0);
    const bundle=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/downloads/nist-elastic.json'),'utf8'));
    await importBundle(bundle);
    assert.equal((await catalog.getSummary()).total,summary.total);
    assert.deepEqual((await catalog.listMaterials({page:1,limit:24,source:'nist-jarvis-elastic'})).materials.map(m=>m.id),ids);
    const app=require('../server');
    listener=await new Promise((resolve,reject)=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));server.on('error',reject);});
    const url=`http://127.0.0.1:${listener.address().port}`;
    const health=await fetch(url+'/api/health').then(r=>r.json());
    assert.equal(health.database,'mysql');
    const response=await fetch(url+'/api/materials/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(stiffness.requirements)}).then(r=>r.json());
    assert.equal(response.count,stiffness.count);
    assert.equal(response.materials.length,50);
    assert.ok(response.excluded.length<=100);
    assert.equal(response.excludedCount,summary.total-response.count);
    assert.equal((await fetch(url+'/api/materials/999999999')).status,404);
    const detail=await fetch(url+'/api/materials/'+ids[0]).then(r=>r.json());
    assert.equal(detail.id,ids[0]);
    const page=await fetch(url+'/api/materials?source=borg-mpea&limit=12&page=2').then(r=>r.json());
    assert.equal(page.total,1545); assert.equal(page.materials.length,12);
    console.log(`Verified ${summary.total.toLocaleString()} real MySQL records, ${stiffness.count.toLocaleString()} stiffness matches, ${tensile.count} tensile matches.`);
  } finally { if(listener) await new Promise(resolve=>listener.close(resolve)); await db.close(); }
});
