// Starts an already initialized, project-local MySQL instance in the foreground.
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const binary = path.join(root, '.runtime/mysql/bin/mysqld');
if (!fs.existsSync(binary)) throw new Error('Project-local MySQL binaries are not installed. Use your own MySQL server and configure server/.env, or follow README.md.');
const child = spawn(binary, ['--no-defaults', `--basedir=${path.join(root,'.runtime/mysql')}`, `--datadir=${path.join(root,'server/database/mysql')}`, `--socket=${path.join(root,'.runtime/mysql.sock')}`, `--pid-file=${path.join(root,'.runtime/mysql.pid')}`, `--log-error=${path.join(root,'.runtime/mysql.log')}`, '--bind-address=127.0.0.1', '--port=3307', '--mysqlx=OFF', '--innodb-buffer-pool-size=512M'], {stdio:'inherit'});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode=1; });
child.on('exit', code => { process.exitCode=code || 0; });
