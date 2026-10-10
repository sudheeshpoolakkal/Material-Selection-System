const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
process.env.NODE_ENV = "test";
process.env.USE_SQLITE = "true";
process.env.SQLITE_PATH = ":memory:";
process.env.JWT_SECRET = "local-automated-test-secret-please-never-use";
const { recommend } = require("../services/recommendation");
const { getCatalog, ready } = require("../services/catalog");
const db = require("../config/db");
const app = require("../server");
let server, base, catalog, owner, reader, writer, project;
const request = async (path, method = "GET", body, token) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
};
before(async () => {
  await ready;
  await require("./fixtures/seed-catalog")();
  catalog = await getCatalog();
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  await new Promise((resolve) => server?.close(resolve));
  await db.close();
});
test("catalog is normalized in SQL and excludes unverified community ratings", () => {
  assert.equal(catalog.length, 16);
  assert.equal(catalog[0].rating, undefined);
  assert.equal(catalog[0].processes.length, 0);
  assert.match(catalog[0].sourceNote, /No supplier/);
});
test("hard limits and mass calculation screen before scoring", () => {
  const r = recommend(catalog, {
    minTensileStrength: 250,
    maxDensity: 4.6,
    volume: 100,
    maxWeight: 0.3,
  });
  assert.ok(r.count > 0);
  for (const m of r.materials) {
    assert.ok(m.properties.tensileStrength >= 250);
    assert.ok(m.properties.density <= 4.6);
    assert.ok(m.estimatedMass <= 0.3);
    assert.equal(
      m.estimatedMass,
      Number((m.properties.density * 0.1).toFixed(3)),
    );
    assert.ok(m.reasons.length >= 3);
  }
});
test("strength and affordability priorities change the winning candidate", () => {
  const strength = recommend(catalog, {
    weights: { strength: 100, lightness: 0, cost: 0, thermal: 0 },
  });
  const cost = recommend(catalog, {
    weights: { strength: 0, lightness: 0, cost: 100, thermal: 0 },
  });
  assert.notEqual(strength.materials[0].id, cost.materials[0].id);
  assert.equal(strength.materials[0].score, 100);
  assert.equal(cost.materials[0].properties.cost, "Low");
});
test("filters do not change normalized scores for surviving candidates", () => {
  const all = recommend(catalog, {}),
    metal = recommend(catalog, { category: "Metal" });
  for (const m of metal.materials)
    assert.equal(m.score, all.materials.find((a) => a.id === m.id).score);
});
test("SQL screening preserves in-memory ranking, global bounds and literal keyword behavior", async () => {
  const {recommendCatalog}=require('../services/catalogRecommendation');
  for(const requirements of [{},{category:'Metal'},{keyword:'Titanium'},{maxDensity:4.6,minTensileStrength:250},{maxCost:'Low'},{weights:{strength:0,lightness:100,cost:0,thermal:0,stiffness:0,vacuum:0}},{process:'CNC machining'}]) {
    const expected=recommend(catalog,requirements),actual=await recommendCatalog(requirements);
    assert.equal(actual.count,expected.count);
    assert.equal(actual.total,expected.total);
    assert.equal(actual.excludedCount,expected.excluded.length);
    assert.deepEqual(actual.materials.map(m=>[m.id,m.score]),expected.materials.slice(0,50).map(m=>[m.id,m.score]));
  }
});
test("vacuum screening keeps zero measurements, rejects unknown values and respects sample limits", () => {
  const sample=(id,properties)=>({id,name:'Sample '+id,description:'',category:'Spacecraft materials',dataKind:'experimental',metadata:{},properties,applications:[],processes:[]});
  const materials=[sample(1,{totalMassLoss:.2,collectedVolatileCondensableMaterial:0}),sample(2,{totalMassLoss:.5,collectedVolatileCondensableMaterial:.05}),sample(3,{totalMassLoss:.1}),sample(4,{totalMassLoss:2,collectedVolatileCondensableMaterial:0}),sample(5,{collectedVolatileCondensableMaterial:0})];
  const r=recommend(materials,{maxTotalMassLoss:1,maxCVCM:.1,weights:{strength:0,lightness:0,cost:0,thermal:0,stiffness:0,vacuum:100}});
  assert.deepEqual(r.materials.map(m=>m.id),[1,2]);
  assert.equal(r.materials[0].score,100);
  const identical=recommend(materials.slice(0,1),{weights:{strength:0,lightness:0,cost:0,thermal:0,stiffness:0,vacuum:100}});
  assert.equal(identical.materials[0].score,100);
});
test("missing manufacturing evidence excludes all candidates", () => {
  const r = recommend(catalog, { process: "CNC machining" });
  assert.equal(r.count, 0);
  assert.equal(r.excluded.length, 16);
  assert.match(r.excluded[0].reasons.join(" "), /supporting data/);
});
test("invalid requirements fail explicitly", () => {
  for (const r of [
    { maxWeight: 3 },
    { maxDensity: "abc" },
    { volume: 0 },
    { minServiceTemp: -300 },
    { weights: { strength: 0, lightness: 0, cost: 0, thermal: 0 } },
    { maxCost: "free" },
  ])
    assert.throws(() => recommend(catalog, r));
});
test("API returns explainable results and rejects invalid input", async () => {
  const good = await request("/api/materials/recommend", "POST", {
    maxCost: "Low",
  });
  assert.equal(good.status, 200);
  assert.ok(good.data.materials.every((m) => m.properties.cost === "Low"));
  assert.ok(good.data.method.includes("Hard constraints"));
  assert.equal(
    (await request("/api/materials/recommend", "POST", { maxWeight: 1 }))
      .status,
    400,
  );
  assert.equal((await request("/api/materials/999")).status, 404);
});
test("reported-property filter excludes missing values before pagination", async () => {
  const property = "tensileStrength";
  const expected = catalog.filter(m => m.properties[property] != null);
  const first = await request(`/api/materials?property=${property}&limit=3&page=1`);
  const second = await request(`/api/materials?property=${property}&limit=3&page=2`);
  assert.equal(first.status, 200);
  assert.equal(first.data.total, expected.length);
  assert.equal(first.data.materials.length, Math.min(3, expected.length));
  assert.ok([...first.data.materials, ...second.data.materials].every(m => m.properties[property] != null));
  assert.ok(second.data.materials.every(m => !first.data.materials.some(a => a.id === m.id)));
  const metals = await request(`/api/materials?property=${property}&category=Metal`);
  assert.equal(metals.data.total, expected.filter(m => m.category === "Metal").length);
  const absent = await request("/api/materials?property=bulkModulus");
  assert.equal(absent.data.total, 0);
  assert.equal((await request("/api/materials?property=invalid")).status, 400);
});
test("engineering and research collections filter before pagination and report scoped counts", async () => {
  await db.execute("INSERT INTO Data_Source (source_id,name,note,source_key,data_kind) VALUES (99,?,?,?,?)", ["Supplier test fixture", "Synthetic test only", "supplier-test-fixture", "literature-extracted"]);
  await db.execute("INSERT INTO Material (material_id,name,category_id,source_id) VALUES (99,?,1,99)", ["Supplier fixture cold rolled"]);
  try {
    await db.execute("INSERT INTO Material_Property VALUES (99,1,7.9,NULL)");
    const engineering = await request("/api/materials?collection=engineering&property=density&limit=1");
    assert.equal(engineering.status, 200);
    assert.equal(engineering.data.total, 1);
    assert.equal(engineering.data.materials[0].id, 99);
    assert.equal(engineering.data.materials[0].dataKind, "literature-extracted");
    assert.equal((await request("/api/materials?collection=research")).data.total, 16);
    assert.equal((await request("/api/materials?collection=all")).data.total, 17);
    assert.equal((await request("/api/materials?collection=engineering&kind=computed")).data.total, 0);
    const summary = await request("/api/materials/summary");
    assert.equal(summary.data.categories.reduce((sum,c) => sum + c.engineeringCount,0), 1);
    assert.equal((await request("/api/materials?collection=invalid")).status, 400);
  } finally {
    await db.execute("DELETE FROM Material_Property WHERE material_id=99");
    await db.execute("DELETE FROM Material WHERE material_id=99");
    await db.execute("DELETE FROM Data_Source WHERE source_id=99");
  }
});
test("accounts normalize email and cannot assign an administrator role", async () => {
  for (const [name, email] of [
    ["Owner", "OWNER@example.test"],
    ["Reader", "reader@example.test"],
    ["Writer", "writer@example.test"],
  ]) {
    const r = await request("/api/auth/register", "POST", {
      name,
      email,
      password: "local-test-password",
      role: "admin",
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.role, "developer");
    if (name === "Owner") owner = r.data;
    else if (name === "Reader") reader = r.data;
    else writer = r.data;
  }
  assert.equal(owner.email, "owner@example.test");
  assert.equal(
    (
      await request("/api/auth/register", "POST", {
        email: "wrong",
        password: "12345678",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/auth/login", "POST", {
        email: "OWNER@example.test",
        password: "local-test-password",
      })
    ).status,
    200,
  );
});
test("project creation and listing work with the upgraded SQLite schema", async () => {
  const created = await request(
    "/api/projects",
    "POST",
    { name: "Test airframe", application: "Aerospace & Defense" },
    owner.token,
  );
  assert.equal(created.status, 201);
  project = created.data.project_id;
  const rows = await request("/api/projects", "GET", undefined, owner.token);
  assert.equal(rows.status, 200);
  assert.equal(rows.data[0].application, "Aerospace & Defense");
  assert.equal(
    (
      await request(
        "/api/projects",
        "POST",
        { name: "Bad", max_weight: -1, target_cost: 20 },
        owner.token,
      )
    ).status,
    400,
  );
});
test("saved selections persist requirements, SQL recommendations and history", async () => {
  const saved = await request(
    `/api/projects/${project}/selection`,
    "PUT",
    { requirements: { maxDensity: 4.6, minTensileStrength: 250 } },
    owner.token,
  );
  assert.equal(saved.status, 200);
  const read = await request(
    `/api/projects/${project}/selection`,
    "GET",
    undefined,
    owner.token,
  );
  assert.equal(read.status, 200);
  assert.equal(read.data.requirements.maxDensity, 4.6);
  assert.equal(read.data.recommendations.length, saved.data.count);
  assert.ok(read.data.recommendations[0].explanation.breakdown);
  const [history] = await db.execute("SELECT * FROM Search_History");
  assert.equal(history.length, 1);
});
test("read collaborators cannot save; write collaborators can; outsiders cannot inspect", async () => {
  const path = `/api/projects/${project}`;
  assert.equal(
    (
      await request(
        path + "/collaborators",
        "POST",
        { email: reader.email, permission_level: "read" },
        owner.token,
      )
    ).status,
    201,
  );
  assert.equal(
    (await request(path + "/selection", "GET", undefined, reader.token)).status,
    200,
  );
  assert.equal(
    (
      await request(
        path + "/selection",
        "PUT",
        { requirements: {} },
        reader.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (await request(path + "/selection", "GET", undefined, writer.token)).status,
    404,
  );
  await request(
    path + "/collaborators",
    "POST",
    { email: writer.email, permission_level: "write" },
    owner.token,
  );
  assert.equal(
    (
      await request(
        path + "/selection",
        "PUT",
        { requirements: { maxCost: "Low" } },
        writer.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        path + "/collaborators",
        "POST",
        { email: reader.email, permission_level: "write" },
        writer.token,
      )
    ).status,
    403,
  );
});
test("concurrent selection saves remain transactional", async () => {
  const results = await Promise.all([
    request(
      `/api/projects/${project}/selection`,
      "PUT",
      { requirements: { category: "Metal" } },
      owner.token,
    ),
    request(
      `/api/projects/${project}/selection`,
      "PUT",
      { requirements: { category: "Polymer" } },
      writer.token,
    ),
  ]);
  assert.ok(results.every((r) => r.status === 200));
  const saved = await request(
    `/api/projects/${project}/selection`,
    "GET",
    undefined,
    owner.token,
  );
  const family = saved.data.requirements.category;
  for (const rec of saved.data.recommendations)
    assert.equal(
      catalog.find((m) => m.id === rec.material_id).category,
      family,
    );
});
test("deleting a project cascades selection data and leaves the material catalog intact", async () => {
  assert.equal(
    (
      await request(
        `/api/projects/${project}`,
        "DELETE",
        undefined,
        reader.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `/api/projects/${project}`,
        "DELETE",
        undefined,
        owner.token,
      )
    ).status,
    200,
  );
  const [rows] = await db.execute("SELECT * FROM Project_Requirement");
  assert.equal(rows.length, 0);
  const [recs] = await db.execute("SELECT * FROM Recommendation");
  assert.equal(recs.length, 0);
  assert.equal((await getCatalog()).length, 16);
});
