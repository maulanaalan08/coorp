import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpkPartyPayload,
  createClientPartyForm,
  mapContractPartiesToForm,
  validateClientPartyForm,
  validateClientSchedule,
} from './spkPartyForm.js';

const project = {
  id: 'project-1',
  client: { name: 'Budi Santoso' },
  location: 'Surabaya Barat',
};

test('creates CLIENT parties from the selected project and company defaults', () => {
  assert.deepEqual(createClientPartyForm(project), {
    firstParty: {
      name: '',
      position: '',
      companyName: 'PT. Dives Jaya Perkasa',
      address: 'Jl. Bulak Rukem Timur I No. 160, Surabaya',
      signatureUrl: null,
    },
    secondParty: {
      name: 'Budi Santoso',
      position: 'Client / Pemberi Tugas',
      companyName: '',
      address: 'Surabaya Barat',
      signatureUrl: null,
    },
  });
});

test('maps modern stored parties when editing a CLIENT draft', () => {
  const contract = {
    type: 'CLIENT',
    partyData: {
      firstParty: { name: 'Rina', position: 'Direktur', companyName: 'DJP', address: 'Surabaya' },
      secondParty: { name: 'Budi', position: 'Pemilik', address: 'Lokasi proyek' },
    },
  };

  const mapped = mapContractPartiesToForm(contract, project);

  assert.equal(mapped.firstParty.name, 'Rina');
  assert.equal(mapped.firstParty.companyName, 'DJP');
  assert.equal(mapped.secondParty.name, 'Budi');
  assert.equal(mapped.secondParty.position, 'Pemilik');
  assert.equal(mapped.secondParty.address, 'Lokasi proyek');
});

test('maps a legacy single CLIENT party to Pihak Kedua without crashing', () => {
  const contract = {
    type: 'CLIENT',
    partyData: { name: 'Client Lama', address: 'Alamat Lama' },
  };

  const mapped = mapContractPartiesToForm(contract, project);

  assert.equal(mapped.firstParty.companyName, 'PT. Dives Jaya Perkasa');
  assert.equal(mapped.secondParty.name, 'Client Lama');
  assert.equal(mapped.secondParty.position, 'Client / Pemberi Tugas');
  assert.equal(mapped.secondParty.address, 'Alamat Lama');
});

test('validates required CLIENT identities and builds a trimmed API payload', () => {
  const invalid = createClientPartyForm({ client: null, location: '' });
  assert.deepEqual(validateClientPartyForm(invalid), [
    'Nama Pihak Pertama wajib diisi.',
    'Jabatan Pihak Pertama wajib diisi.',
    'Nama Pihak Kedua wajib diisi.',
    'Alamat project Pihak Kedua belum tersedia.',
  ]);

  const parties = {
    firstParty: { name: '  Rina  ', position: ' Direktur ', companyName: ' DJP ', address: ' Surabaya ' },
    secondParty: { name: ' Budi ', position: ' Pemilik ', companyName: '', address: ' Lokasi ' },
  };
  assert.deepEqual(buildSpkPartyPayload('CLIENT', { clientParties: parties }), {
    firstParty: { name: 'Rina', position: 'Direktur', companyName: 'DJP', address: 'Surabaya', signatureUrl: null },
    secondParty: { name: 'Budi', position: 'Pemilik', companyName: '', address: 'Lokasi', signatureUrl: null },
    partyData: {
      firstParty: { name: 'Rina', position: 'Direktur', companyName: 'DJP', address: 'Surabaya', signatureUrl: null },
      secondParty: { name: 'Budi', position: 'Pemilik', companyName: '', address: 'Lokasi', signatureUrl: null },
    },
  });
});

test('keeps the legacy SUBCON payload contract intact', () => {
  assert.deepEqual(buildSpkPartyPayload('SUBCON', { subconPartyName: '  CV Karya  ' }), {
    partyName: 'CV Karya',
    partyData: { contractorName: 'CV Karya' },
  });
});

test('requires CLIENT schedule start and end dates', () => {
  assert.deepEqual(validateClientSchedule({
    workDurationDays: '10',
    startDate: '',
    endDate: '',
  }), [
    'Tanggal mulai pekerjaan wajib diisi.',
    'Tanggal selesai pekerjaan wajib diisi.',
  ]);
});

test('rejects a CLIENT schedule ending before it starts', () => {
  assert.deepEqual(validateClientSchedule({
    workDurationDays: '10',
    startDate: '2026-10-09',
    endDate: '2026-10-08',
  }), ['Tanggal selesai tidak boleh sebelum tanggal mulai.']);

  assert.deepEqual(validateClientSchedule({
    workDurationDays: '10',
    startDate: '2026-10-08',
    endDate: '2026-10-08',
  }), []);
});
