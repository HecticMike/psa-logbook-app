import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db, setMeta } from '../../src/lib/db';
vi.mock('../../src/config', () => ({
  GOOGLE_CLIENT_ID: 'test-client',
  DRIVE_FILE_NAME: 'psa-logbook-data.json',
  DRIVE_FOLDER_NAME: 'PsA-Logbook',
  DRIVE_SCOPE: 'drive.file'
}));
beforeEach(async () => {
  vi.resetModules();
  await db.meta.clear();
  await db.events.clear();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }: { callback: (data: unknown) => void }) => ({
            requestAccessToken: () => callback({ access_token: 'test-only', expires_in: 3600 })
          })
        }
      }
    }
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('does not create a folder or file during a restore with no backup', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ files: [] }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const drive = await import('../../src/lib/drive');
  await drive.connectDrive();
  await expect(drive.restoreFromDrive()).rejects.toThrow('No PsA Logbook backup folder');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1].method).toBe('GET');
});
it('omits parents from backup PATCH metadata', async () => {
  const drive = await import('../../src/lib/drive');
  await drive.connectDrive();
  await setMeta('driveFolderId', 'folder');
  await setMeta('driveFileId', 'file');
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  await drive.backupToDrive();
  expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
  expect(fetchMock.mock.calls[0][1].body).not.toContain('"parents"');
});
it('clears stale account file IDs and reports expired authorization', async () => {
  await setMeta('driveFolderId', 'old-account');
  const drive = await import('../../src/lib/drive');
  await drive.connectDrive();
  expect((await drive.getDriveStatus()).folderId).toBeUndefined();
  const future = Date.now() + 3600001;
  vi.spyOn(Date, 'now').mockReturnValue(future);
  expect((await drive.getDriveStatus()).connected).toBe(false);
});
it('rejects popup cancellation rather than leaving controls busy forever', async () => {
  vi.stubGlobal('window', {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: ({ error_callback }: { error_callback: () => void }) => ({
            requestAccessToken: () => error_callback()
          })
        }
      }
    }
  });
  const drive = await import('../../src/lib/drive');
  await expect(drive.connectDrive()).rejects.toThrow('closed or blocked');
});
