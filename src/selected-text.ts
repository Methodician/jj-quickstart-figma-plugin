export const experimentWithSelectedText = async () => {
  const nodes = figma.currentPage.selection;
  console.log({ nodes });
  for (const node of nodes) {
    if (node.type === 'TEXT') {
      const description = await getTextNodeDescription(node);
      console.log(description);
      await cycleFonts(node);
    }
  }
};

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
