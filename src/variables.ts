export const experimentWithVariables = async () => {
  figma.notify('Hello, variables!');
  const localCollections =
    await figma.variables.getLocalVariableCollectionsAsync();
  for (const collection of localCollections) {
    console.log(collection.name);
    console.log(collection.modes);
    for (const vid of collection.variableIds) {
      console.log(vid);
    }
  }
  const localVariables = await await figma.variables.getLocalVariablesAsync();
  console.log({ localVariables });
};

export const listVarsBoundToNode = async (node: BaseNode) => {
  console.log(node.type);
  if (
    node.type === 'GROUP' ||
    node.type === 'PAGE' ||
    node.type === 'DOCUMENT'
  ) {
    for (const child of node.children) {
      listVarsBoundToNode(child);
    }
  } else {
    const boundVars = node.boundVariables!;
    console.log(node.name, { boundVars });
  }
};

export const listVarsBoundToSelection = async () => {
  const nodes = figma.currentPage.selection;
  for (const node of nodes) {
    listVarsBoundToNode(node);
  }
};

export const createVariableCollection = (name: string) => {
  const collection = figma.variables.createVariableCollection(name);
  const lowestPositiveIntegerVar = figma.variables.createVariable(
    'Lowest Positive Integer',
    collection,
    'FLOAT'
  );
  for (const mode of collection.modes) {
    lowestPositiveIntegerVar.setValueForMode(mode.modeId, 1);
  }
  console.log(collection);
  return collection.name;
};
