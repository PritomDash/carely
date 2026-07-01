import locationsData from '../data/bd-locations.json';

export const getDivisions = () =>
  locationsData.divisions.map(d => d.name);

export const getDistricts = (division) => {
  const div = locationsData.divisions.find(d => d.name === division);
  return div ? div.districts.map(d => d.name) : [];
};

export const getThanas = (division, district) => {
  const div = locationsData.divisions.find(d => d.name === division);
  if (!div) return [];
  const dist = div.districts.find(d => d.name === district);
  return dist ? dist.thanas : [];
};

export const getAllThanas = () => {
  const thanas = [];
  for (const div of locationsData.divisions) {
    for (const dist of div.districts) {
      for (const thana of dist.thanas) {
        thanas.push({ thana, district: dist.name, division: div.name });
      }
    }
  }
  return thanas;
};
