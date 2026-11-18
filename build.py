import pathlib,shutil
w=pathlib.Path('web');h=(w/'shell.html').read_text(encoding='utf8')
js='\n'.join((w/f).read_text(encoding='utf8') for f in['i18n.js','mux.js','demux.js','tracker.js','face.js','app.js'])
assert '</script' not in js
h=h.replace('/*CSS*/',(w/'style.css').read_text(encoding='utf8')).replace('/*JS*/',js)
pathlib.Path('dist').mkdir(exist_ok=True);pathlib.Path('dist/index.html').write_text(h,encoding='utf8');pathlib.Path('android/app/src/main/assets/index.html').write_text(h,encoding='utf8');print(len(h.encode()),'bytes')

pathlib.Path('docs').mkdir(exist_ok=True);shutil.copy('play/privacy-policy.html','docs/privacy-policy.html')

for t in ['dist/vendor','android/app/src/main/assets/vendor']:
    shutil.rmtree(t,ignore_errors=True);shutil.copytree('web/vendor',t)
    b=pathlib.Path(t,'vision_bundle.js');b.write_text('(function(module,exports){\n'+b.read_text(encoding='utf8')+'\n})(window.__mp={exports:{}},window.__mp.exports);\n',encoding='utf8')
