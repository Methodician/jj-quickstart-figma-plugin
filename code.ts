// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".

const page = figma.currentPage;
let initialCount = 0;

const createRectangles = async () => {
  reduceOpacity();
  const count = await getCount();
  const separation = await getAndIterateDistance(count);
  addRectangles(count, separation);
  if (count > 2) {
    await iterateCount();
    await createRectangles();
  } else {
    return;
  }
};

const reduceOpacity = () => {
  const rectangleNodes = page.findAll((node) => node.type === 'RECTANGLE');
  figma.currentPage.selection = rectangleNodes;
  figma.viewport.scrollAndZoomIntoView(rectangleNodes);
  for (const node of rectangleNodes) {
    if ('opacity' in node && node.type !== 'TEXT') {
      node.opacity *= 0.84;
    }
  }
};

const addRectangles = (count: number, separation: number) => {
  for (let i = 0; i < count; i++) {
    const rect = figma.createRectangle();
    const angle = 0.1 * i;
    const spiralRadius = separation * angle;
    rect.x = spiralRadius * Math.cos(angle);
    rect.y = spiralRadius * Math.sin(angle);
    rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
    page.appendChild(rect);
  }
};

let _countNode: TextNode | null = null;
const getCountNode = async () => {
  if (!_countNode) {
    const node = page.findOne((node) => node.name === 'Count');
    if (node && node.type === 'TEXT') {
      const { fontName } = node;
      if (typeof fontName === 'symbol') {
        throw new Error('Cannot load font');
      }
      await figma.loadFontAsync(fontName);
      _countNode = node;
    }
  }
  return _countNode;
};
const getCount = async () => {
  const countNode = await getCountNode();
  if (countNode) {
    const count = parseInt(countNode.characters, 10);
    return count;
  }
  return 0;
};
const setCount = async (count: number) => {
  console.log('setting count', count);
  const countNode = await getCountNode();
  if (countNode) {
    countNode.deleteCharacters(0, countNode.characters.length);
    countNode.insertCharacters(0, count.toString());
  }
};

const iterateCount = async () => {
  const count = await getCount();
  return setCount(Math.round(count * 0.76));
};

const getAndIterateDistance = async (count: number) => {
  const distanceNode = page.findChild((node) => node.name === 'Distance');
  if (distanceNode && distanceNode.type === 'TEXT') {
    const { fontName } = distanceNode;
    if (typeof fontName === 'symbol') {
      throw new Error('Cannot load font');
    }
    await figma.loadFontAsync(fontName);
    const targetTotal = 100 * initialCount;
    const rectTotal = count * 100;
    const remainingSpace = targetTotal - rectTotal;
    const distance = remainingSpace / (count - 1) + 100;
    distanceNode.deleteCharacters(0, distanceNode.characters.length);
    distanceNode.insertCharacters(0, distance.toString());
    return distance;
  }
  return 0;
};

figma.parameters.on('input', ({ parameters, query, key, result }) => {
  console.log('parameters input', { parameters, query, key, result });
  switch (key) {
    case 'count':
      result.setSuggestions(
        ['16', '23', '50', '99'].filter((s) => s.includes(query))
      );
      break;
    case 'distance':
      result.setSuggestions(
        ['100', '200', '300', '400'].filter((s) => s.includes(query))
      );
      break;
    default:
      return;
  }
});

figma.on('run', async ({ command, parameters }) => {
  console.log('run', { command, parameters });
  if (!parameters) return;
  if (command === 'create-rectangles') {
    await setCount(parameters.count);
    initialCount = parameters.count;
    await createRectangles();
    console.log('did it');
  }
  figma.closePlugin();
});
