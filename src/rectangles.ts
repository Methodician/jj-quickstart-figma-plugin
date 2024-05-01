const page = figma.currentPage;
let initialCount = 0;

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

const setCount = async (count: number) => {
  console.log('setting count', count);
  const countNode = await getCountNode();
  if (countNode) {
    countNode.deleteCharacters(0, countNode.characters.length);
    countNode.insertCharacters(0, count.toString());
  }
};

const getCount = async () => {
  const countNode = await getCountNode();
  if (countNode) {
    const count = parseInt(countNode.characters, 10);
    return count;
  }
  return 0;
};

const getGeneratedRectangles = () =>
  page.findAll(
    (node) =>
      node.type === 'RECTANGLE' &&
      'opacity' in node &&
      typeof node.fills !== 'symbol' &&
      node.fills.length > 0 &&
      node.fills[0].type === 'SOLID' &&
      node.fills[0].color.r === 1 &&
      node.fills[0].color.g === 0.5 &&
      node.fills[0].color.b === 0
  ) as RectangleNode[];

const reduceOpacity = () => {
  const rectangleNodes = getGeneratedRectangles();
  for (const node of rectangleNodes) {
    node.opacity *= 0.84;
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

const selectAllGeneratedRectangles = () => {
  const rectangleNodes = getGeneratedRectangles();
  figma.currentPage.selection = rectangleNodes;
  figma.viewport.scrollAndZoomIntoView(rectangleNodes);
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

let isFirstRun = true;
export const createRectangles = async (parameters: ParameterValues) => {
  if (isFirstRun) {
    initialCount = parameters.count;
    await setCount(parameters.count);
    isFirstRun = false;
  }

  reduceOpacity();
  const count = await getCount();
  const separation = await getAndIterateDistance(count);
  addRectangles(count, separation);
  if (count > 2) {
    await iterateCount();
    await createRectangles(parameters);
  } else {
    selectAllGeneratedRectangles();
    return;
  }
};
