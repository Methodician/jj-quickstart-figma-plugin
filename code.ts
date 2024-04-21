const page = figma.currentPage;
let initialCount = 0;

const getTextNodeDescription = (node: TextNode) => {
  const {
    fontName,
    fontSize,
    characters,
    textAlignVertical,
    textAlignHorizontal,
  } = node;

  let fonts, sizes;
  if (fontName === figma.mixed) {
    fonts = node.getStyledTextSegments(['fontName']);
  }
  if (fontSize === figma.mixed) {
    sizes = node.getStyledTextSegments(['fontSize']);
  }
  return {
    characters,
    fontName: fontName === figma.mixed ? 'mixed' : fontName,
    fonts,
    fontSize: fontSize === figma.mixed ? 'mixed' : fontSize,
    sizes,
    textAlignVertical,
    textAlignHorizontal,
  };
};

const cycleFonts = async (node: TextNode) => {
  const { fontName, fonts } = getTextNodeDescription(node);
  // get any fonts required
  if (fonts) {
    for (const font of fonts) {
      await figma.loadFontAsync(font.fontName as FontName);
    }
  } else {
    await figma.loadFontAsync(fontName as FontName);
  }
  // switch all fonts to the next font
  if (fonts) {
    for (const [index, font] of fonts.entries()) {
      const nextFont = fonts[(index + 1) % fonts.length];
      node.setRangeFontName(font.start, font.end, nextFont.fontName);
    }
  } else {
    figma.notify("No mixed fonts found so we won't cycle them");
  }
};

const experimentWithSelectedText = async () => {
  const nodes = figma.currentPage.selection;
  for (const node of nodes) {
    if (node.type === 'TEXT') {
      const description = await getTextNodeDescription(node);
      console.log(description);
      await cycleFonts(node);
    }
  }
};

const invertImageColors = async (node: RectangleNode) => {
  const newFills: Array<Paint> = [];
  // check if nodeFills is an array of Paints
  if (!Array.isArray(node.fills)) {
    figma.closePlugin('Plugin should be run on a node with paint fills');
  }
  for (const paint of node.fills as Array<Paint>) {
    if (paint.type === 'IMAGE' && paint.imageHash) {
      const image = figma.getImageByHash(paint.imageHash);
      const bytes = await image!.getBytesAsync();

      // Create an invisible iframe to act as a "worker" which will do the task
      // of decoding and send us a message when it's done.
      // (workaround to use browser APIs in a plugin)
      figma.showUI(__html__, { visible: false });
      // Send the raw bytes of the file to the worker.
      figma.ui.postMessage(bytes);
      // Wait for the worker's response.
      const newBytes: Uint8Array = await new Promise((resolve, reject) => {
        return (figma.ui.onmessage = (value) => {
          if (!(value instanceof Uint8Array)) {
            reject(new Error('Expected Uint8Array'));
          } else {
            resolve(value);
          }
        });
      });
      // Create a new paint for the new image.
      const newPaint = JSON.parse(JSON.stringify(paint));
      newPaint.imageHash = figma.createImage(newBytes).hash;
      newFills.push(newPaint);
    }
  }
  node.fills = newFills;
};

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
    } else {
      await runWithCommandOnly(command);
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

const runWithCommandOnly = async (command: string) => {
  console.log({ command });
  switch (command) {
    case 'invert-image-colors': {
      const nodes = figma.currentPage.selection;
      console.log({ nodes });
      if (nodes.length === 0) {
        return figma.closePlugin('Select a node with an image fill');
      }
      for (const node of nodes) {
        if (node.type === 'RECTANGLE') {
          await invertImageColors(node);
        }
      }
      break;
    }
    case 'test-text-nodes': {
      await experimentWithSelectedText();
      break;
    }
    default:
      return figma.closePlugin('Unknown command');
  }
};

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
    case 'invert-image-colors': {
      const nodes = figma.currentPage.selection;
      console.log({ nodes });
      if (nodes.length === 0) {
        return figma.closePlugin('Select a node with an image fill');
      }
      for (const node of nodes) {
        if (node.type === 'RECTANGLE') {
          await invertImageColors(node);
        }
      }
      break;
    }
    default:
      return figma.closePlugin('Unknown command');
  }
};
