const { spawnSync } = require('child_process');

/**
 *
 * @param compare
 * @param branch
 * @returns {string[]} list of changed files. Prefixed with operation
 */
exports.diff = function (compare, branch) {
    const gitDiff = spawnSync('git', ['--no-pager', 'diff', '--name-status', branch, compare]);
    const gitDiffStdOut = gitDiff.stdout.toString();
    const gitDiffStdErr = gitDiff.stderr.toString();

    if (gitDiffStdErr) {
        throw Error('An error occurred while generating diff. Stderr from git: ' +  gitDiffStdErr);
    }

    return gitDiffStdOut.split('\n');
};
