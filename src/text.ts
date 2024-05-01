export const addPopulatedTextNode = async (text: string) => {
  const textNode = figma.createText();
  await figma.loadFontAsync(textNode.fontName as FontName);

  textNode.characters = text;
};
