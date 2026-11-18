export function themeControls(brief, changed) {
  const group = document.createElement('fieldset');
  group.className = 'edition-theme';
  const legend = document.createElement('legend');
  legend.textContent = 'Page colors and headline type';
  group.append(legend);
  const theme = {paper:'#f3f2e9', ink:'#10241b', display:'sans', ...brief.theme};
  for (const [name,labelText] of [['paper','Paper'],['ink','Ink'],['display','Headline']]) {
    const label = document.createElement('label');
    label.append(document.createTextNode(labelText));
    const control = document.createElement(name === 'display' ? 'select' : 'input');
    if (name === 'display') {
      control.add(new Option('Sans serif','sans'));
      control.add(new Option('Serif','serif'));
    } else control.type = 'color';
    control.value = theme[name];
    control.addEventListener('input', () => {
      theme[name] = control.value;
      brief.theme = {...theme};
      changed();
    });
    label.append(control);
    group.append(label);
  }
  return group;
}
