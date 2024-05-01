export const fetchSomething = async (fetchUrl: string) => {
  const response = await fetch(fetchUrl);
  const json = await response.json();
  return json;
};
