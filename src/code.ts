import { fetchSomething } from './fetch';
import { createImage, invertImageColors } from './images';
import { createRectangles } from './rectangles';
import { experimentWithSelectedText } from './selected-text';
import { addPopulatedTextNode } from './text';
import {
  createVariableCollection,
  experimentWithVariables,
  listVarsBoundToSelection,
} from './variables';

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
    case 'test-text-nodes':
      await experimentWithSelectedText();
      break;
    case 'test-variables':
      await experimentWithVariables();
      break;
    case 'list-variables-bound-to-selection':
      await listVarsBoundToSelection();
      break;
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
      await createRectangles(parameters);
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
    case 'create-variable-collection': {
      if (!parameters.name) {
        return figma.closePlugin('Name parameter is required');
      }
      const name = await createVariableCollection(parameters.name);
      console.log(name);
      break;
    }
    default:
      return figma.closePlugin('Unknown command');
  }
};
