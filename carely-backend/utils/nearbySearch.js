const findNearbyProfessionals = (professionals, customerLocation, serviceType) => {
  const { division, district, thana } = customerLocation || {};

  const score = (pro) => {
    if (!pro.location) return 0;
    if (pro.location.thana    === thana)    return 3;
    if (pro.location.district === district) return 2;
    if (pro.location.division === division) return 1;
    return 0;
  };

  return professionals
    .filter(p => !serviceType || p.professionalType === serviceType)
    .filter(p => score(p) > 0)
    .sort((a, b) => score(b) - score(a));
};

module.exports = { findNearbyProfessionals };
