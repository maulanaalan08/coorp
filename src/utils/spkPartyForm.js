export const FIRST_PARTY_DEFAULTS = Object.freeze({
  name: '',
  position: '',
  companyName: 'PT. Dives Jaya Perkasa',
  address: 'Jl. Bulak Rukem Timur I No. 160, Surabaya',
  signatureUrl: null,
});

export const SECOND_PARTY_DEFAULT_POSITION = 'Client / Pemberi Tugas';

const normalizeParty = (party = {}, defaults = {}) => ({
  name: String(party.name ?? defaults.name ?? '').trim(),
  position: String(party.position ?? defaults.position ?? '').trim(),
  companyName: String(party.companyName ?? defaults.companyName ?? '').trim(),
  address: String(party.address ?? defaults.address ?? '').trim(),
  signatureUrl: party.signatureUrl || defaults.signatureUrl || null,
});

export const createClientPartyForm = (project = {}) => ({
  firstParty: normalizeParty({}, FIRST_PARTY_DEFAULTS),
  secondParty: normalizeParty({}, {
    name: project?.client?.name || '',
    position: SECOND_PARTY_DEFAULT_POSITION,
    companyName: '',
    address: project?.location || '',
    signatureUrl: null,
  }),
});

const storedPartyData = (contract = {}) => (
  contract.partyData
  || contract.snapshot?.partyData
  || contract.snapshot?.parties
  || contract.snapshot?.party
  || {}
);

export const mapContractPartiesToForm = (contract = {}, project = {}) => {
  const defaults = createClientPartyForm(project);
  const stored = storedPartyData(contract);

  if (stored.firstParty || stored.secondParty) {
    return {
      firstParty: normalizeParty(stored.firstParty, defaults.firstParty),
      secondParty: normalizeParty(stored.secondParty, defaults.secondParty),
    };
  }

  const legacySecondParty = {
    name: stored.name || contract.snapshot?.clientName,
    position: stored.position || stored.signerPosition,
    companyName: stored.companyName,
    address: stored.address || contract.snapshot?.projectLocation,
    signatureUrl: stored.signatureUrl,
  };
  return {
    firstParty: defaults.firstParty,
    secondParty: normalizeParty(legacySecondParty, defaults.secondParty),
  };
};

export const validateClientPartyForm = ({ firstParty = {}, secondParty = {} } = {}) => {
  const errors = [];
  if (!String(firstParty.name || '').trim()) errors.push('Nama Pihak Pertama wajib diisi.');
  if (!String(firstParty.position || '').trim()) errors.push('Jabatan Pihak Pertama wajib diisi.');
  if (!String(secondParty.name || '').trim()) errors.push('Nama Pihak Kedua wajib diisi.');
  if (!String(secondParty.position || '').trim()) errors.push('Jabatan Pihak Kedua wajib diisi.');
  if (!String(secondParty.address || '').trim()) errors.push('Alamat project Pihak Kedua belum tersedia.');
  return errors;
};

export const validateClientSchedule = ({ workDurationDays, startDate, endDate } = {}) => {
  const errors = [];
  if (!Number.isFinite(Number(workDurationDays)) || Number(workDurationDays) <= 0) {
    errors.push('Durasi pekerjaan wajib lebih dari 0 hari.');
  }
  if (!String(startDate || '').trim()) errors.push('Tanggal mulai pekerjaan wajib diisi.');
  if (!String(endDate || '').trim()) errors.push('Tanggal selesai pekerjaan wajib diisi.');
  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    errors.push('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  }
  return errors;
};

export const buildSpkPartyPayload = (type, { clientParties, subconPartyName = '' } = {}) => {
  if (type === 'CLIENT') {
    const firstParty = normalizeParty(clientParties?.firstParty, FIRST_PARTY_DEFAULTS);
    const secondParty = normalizeParty(clientParties?.secondParty, { position: SECOND_PARTY_DEFAULT_POSITION });
    return {
      firstParty,
      secondParty,
      partyData: { firstParty, secondParty },
    };
  }

  const partyName = String(subconPartyName || '').trim();
  return {
    partyName,
    partyData: { contractorName: partyName },
  };
};
