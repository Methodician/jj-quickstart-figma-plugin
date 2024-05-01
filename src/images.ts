export const invertImageColors = async (node: RectangleNode) => {
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

export const createImage = async (
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
