// Runs every automated check. Usage: npm run check
// Exits with code 1 if any check finds a problem.
import checkData from './checks/data.mjs';
import checkSiteRules from './checks/site-rules.mjs';
import checkEngine from './checks/engine.mjs';
import checkLayout from './checks/layout.mjs';
import checkPlaythrough from './checks/playthrough.mjs';

const CHECKS = [checkData, checkEngine, checkSiteRules, checkPlaythrough, checkLayout];

let failed = 0;
for (const run of CHECKS) {
    let result;
    try {
        result = await run();
    } catch (err) {
        result = { name: run.name, problems: [`could not run: ${err.message}`], summary: '' };
    }
    const ok = result.problems.length === 0;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${result.name}${result.summary ? ` (${result.summary})` : ''}`);
    for (const p of result.problems) console.log(`      - ${p}`);
}

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exitCode = failed ? 1 : 0;
