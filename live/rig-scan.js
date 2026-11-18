const fs = require('fs');
for (const f of ['source-readable.js', 'captured.js']) {
  const s = fs.readFileSync('C:/Users/Administrator/Downloads/deadshot/live/' + f, 'utf8');
  console.log('\n===== ' + f + ' =====');
  const terms = ['X79D_15e(', 'AnimationMixer', 'SkinnedMesh', 'Skeleton', 'Bone(', 'clipAction', 'playerRigNames', 'femalerigged', 'rigged_untextured', 'character/', 'skeleton', 'bones', 'bone'];
  for (const t of terms) {
    let i = 0, c = 0;
    console.log('\n### ' + t);
    while ((i = s.indexOf(t, i)) >= 0 && c < 6) {
      if (i > 400000) console.log('@' + i + ': ' + JSON.stringify(s.slice(Math.max(0, i - 200), i + 300)));
      i += t.length; c++;
    }
    if (!c) console.log('none');
  }
}
