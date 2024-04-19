// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".

const page = figma.currentPage;
let initialCount = 0;

const createImage = async (
  imageUrl: string,
  dimensions?: { width: number; height: number }
) => {
  // Create a rectangle node with the necessary dimensions
  const image = await figma.createImageAsync(imageUrl);
  const _dimensions = dimensions || (await image.getSizeAsync());
  if (_dimensions.width > 4096 || _dimensions.height > 4096) {
    return figma.closePlugin(
      'Width and height must not be more than 4096 pixels'
    );
  }
  if (isNaN(_dimensions.width) || isNaN(_dimensions.height)) {
    return figma.closePlugin('Width and height must be numbers');
  }
  const node = figma.createRectangle();
  node.resize(_dimensions.width, _dimensions.height);

  // Render the image by filling the rectangle
  node.fills = [
    {
      type: 'IMAGE',
      imageHash: image.hash,
      scaleMode: 'FILL',
    },
  ];
};

const fetchSomething = async (fetchUrl: string) => {
  const response = await fetch(fetchUrl);
  const json = await response.json();
  return json;
};

const addPopulatedTextNode = async (text: string) => {
  const textNode = figma.createText();
  await figma.loadFontAsync(textNode.fontName as FontName);

  textNode.characters = text;
};

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

figma.parameters.on('input', ({ query, key, result }) => {
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
    case 'requestUrl':
      result.setSuggestions([
        query,
        'https://httpbin.org/get?success=true',
        'https://jsonplaceholder.typicode.com/posts/1',
      ]);
      break;
    case 'imageUrl':
      result.setSuggestions([
        query,
        'https://picsum.photos/200/300',
        'https://picsum.photos/256',
        'https://picsum.photos/512',
      ]);
      break;
    default:
      return;
  }
});

figma.on('run', async (event) => {
  const { command, parameters } = event;
  try {
    if (parameters) {
      await runWithParamsAndCommand(command, parameters);
    }
  } catch (error) {
    console.error(error);
    error && figma.notify(error.toString());
    figma.closePlugin(
      `The command ${command} failed. Check the console for more info.`
    );
  } finally {
    figma.closePlugin(`Completed ${command}.`);
  }
});

const runWithParamsAndCommand = async (
  command: string,
  parameters: ParameterValues
) => {
  console.log({ command, parameters });
  switch (command) {
    case 'create-rectangles':
      if (!parameters.count) {
        return figma.closePlugin('Count parameter is required');
      }
      await setCount(parameters.count);
      initialCount = parameters.count;
      await createRectangles();
      break;
    case 'network-request': {
      if (!parameters.requestUrl) {
        return figma.closePlugin('Request URL parameter is required');
      }
      const something = await fetchSomething(parameters.requestUrl);
      const text = JSON.stringify(something, null, 2);
      await addPopulatedTextNode(text);
      break;
    }
    case 'add-image': {
      if (!parameters.imageUrl) {
        return figma.closePlugin('Image URL parameter is required');
      }
      if (parameters.width && parameters.height) {
        await createImage(parameters.imageUrl, {
          width: parseInt(parameters.width, 10),
          height: parseInt(parameters.height, 10),
        });
      } else {
        await createImage(parameters.imageUrl);
      }
      break;
    }
  }
};
