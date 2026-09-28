const fs = require('fs');
const path = require('path');

function updateFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;
    data.segments.forEach(s => {
        if (s.text.includes('Min') && s.text.includes('aina')) {
            s.text = s.text.replace(/"Min/, '"مِنْ');
            changed = true;
        }
        if (s.text.includes('aina takul?"')) {
            s.text = s.text.replace(/aina takul\?"/, 'أَيْنَ تَأْكُلُ؟"');
            changed = true;
        }
        if (s.text.includes('min aina takl?')) {
            s.text = s.text.replace(/min aina takl\?/, '"مِنْ أَيْنَ تَأْكُلُ؟"');
            changed = true;
        }
    });
    
    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Updated ${filePath}`);
    }
}

updateFile('./result/json/Jaminan Rezeki.json');
updateFile('./result/json/W9FM56Ix_Zw.json');
