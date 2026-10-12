export const FIRST_PARTY_DEFAULTS = Object.freeze({
  name: '',
  position: '',
  companyName: 'PT. Dives Jaya Perkasa',
  address: 'Jl. Bulak Rukem Timur I No. 160, Surabaya',
  nik: '',
  phone: '',
  signatureUrl: null,
});

export const SECOND_PARTY_DEFAULT_POSITION = 'Client / Pemberi Tugas';

const normalizeParty = (party = {}, defaults = {}) => {
  const normalized = {
    name: String(party.name ?? defaults.name ?? '').trim(),
    position: String(party.position ?? defaults.position ?? '').trim(),
    companyName: String(party.companyName ?? defaults.companyName ?? '').trim(),
    address: String(party.address ?? defaults.address ?? '').trim(),
    signatureUrl: party.signatureUrl || defaults.signatureUrl || null,
  };
  const nik = String(party.nik ?? party.idNumber ?? defaults.nik ?? '').trim();
  const phone = String(party.phone ?? defaults.phone ?? '').trim();
  if (nik) normalized.nik = nik;
  if (phone) normalized.phone = phone;
  return normalized;
};

export const createSubconPartyForm = (project = {}) => ({
  firstParty: normalizeParty({
    position: 'Direktur',
    companyName: 'PT. Dives Jaya Perkasa',
    address: 'Jl. Bulak Rukem Timur I No. 160, Surabaya',
  }),
  secondParty: normalizeParty({
    position: 'Penyedia Jasa',
    address: project?.location || '',
  }),
});

export const mapSubconPartiesToForm = (contract = {}, project = {}) => {
  const defaults = createSubconPartyForm(project);
  const stored = storedPartyData(contract);
  const firstParty = stored.firstParty || {
    name: stored.internalName,
    position: stored.internalPosition,
    companyName: stored.companyName,
    address: stored.internalAddress,
    nik: stored.internalNik,
  };
  const secondParty = stored.secondParty || {
    name: stored.contractorName || stored.name || contract.snapshot?.party?.name,
    position: stored.contractorPosition,
    address: stored.address || contract.snapshot?.projectLocation,
    nik: stored.contractorNik || stored.nik,
    phone: stored.contractorPhone || stored.phone,
  };
  return {
    firstParty: normalizeParty(firstParty, defaults.firstParty),
    secondParty: normalizeParty(secondParty, defaults.secondParty),
  };
};

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

export const validateSubconPartyForm = ({ firstParty = {}, secondParty = {} } = {}) => {
  const errors = [];
  if (!String(firstParty.name || '').trim()) errors.push('Nama Pihak Pertama wajib diisi.');
  if (!String(firstParty.position || '').trim()) errors.push('Jabatan Pihak Pertama wajib diisi.');
  if (!String(firstParty.nik || '').trim()) errors.push('No. KTP Pihak Pertama wajib diisi.');
  if (!String(firstParty.address || '').trim()) errors.push('Alamat Pihak Pertama wajib diisi.');
  if (!String(secondParty.name || '').trim()) errors.push('Nama subcon wajib diisi.');
  if (!String(secondParty.position || '').trim()) errors.push('Jabatan subcon wajib diisi.');
  if (!String(secondParty.nik || '').trim()) errors.push('No. KTP subcon wajib diisi.');
  if (!String(secondParty.address || '').trim()) errors.push('Alamat subcon wajib diisi.');
  return errors;
};

export const buildSpkPartyPayload = (type, { clientParties, subconParties, subconPartyName = '' } = {}) => {
  if (type === 'CLIENT') {
    const firstParty = normalizeParty(clientParties?.firstParty, FIRST_PARTY_DEFAULTS);
    const secondParty = normalizeParty(clientParties?.secondParty, { position: SECOND_PARTY_DEFAULT_POSITION });
    return {
      firstParty,
      secondParty,
      partyData: { firstParty, secondParty },
    };
  }

  const partyName = String(
    subconParties?.secondParty?.name || subconPartyName || '',
  ).trim();
  if (!subconParties) {
    return {
      partyName,
      partyData: { contractorName: partyName },
    };
  }
  const subconDefaults = createSubconPartyForm();
  const firstParty = normalizeParty(subconParties?.firstParty, subconDefaults.firstParty);
  const secondParty = normalizeParty(
    { ...subconParties?.secondParty, name: partyName },
    subconDefaults.secondParty,
  );
  return {
    partyName,
    firstParty,
    secondParty,
    partyData: { contractorName: partyName, firstParty, secondParty },
  };
};
