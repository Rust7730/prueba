// Obtenemos la última versión de los datos de Riot dinámicamente
const getLatestPatchVersion = async () => {
  const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  if (!response.ok) throw new Error('Error al obtener la versión de Riot');
  const versions = await response.json();
  return versions[0];
};

export const validateChampion = async (championName: string) => {
  try {
    const version = await getLatestPatchVersion();
    const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/es_MX/champion.json`);
    
    if (!response.ok) return false;

    const data = await response.json();
    const champions = data.data;

    return !!champions[championName];
  } catch (error) {
    console.error('Error validando el campeón con Riot:', error);
    return false; 
  }
};