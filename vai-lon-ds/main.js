import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fetch from 'cross-fetch';
import { app, BrowserWindow, net, protocol, session, shell } from 'electron';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets');
const ICON_PATH = path.join(
	ASSETS_DIR,
	process.platform === 'win32' ? 'favicon.ico' : 'favicon.png',
);

const BASE_WEB_PREFERENCES = {
	contextIsolation: true,
	nodeIntegration: false,
	sandbox: true,
	spellcheck: false,
};

app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
// Route the whole session through Reqable so game traffic (HTTP + WSS) is
// captured for debugging. The Reqable root CA is already in the Windows store,
// so Chromium accepts the MITM certificate without extra switches.
app.commandLine.appendSwitch('proxy-server', 'http://127.0.0.1:9000');
// Keep rendering/timers alive when the window is unfocused or occluded, so the
// game loop and the in-page diagnostics do not stall behind another window.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-background-timer-throttling');

if (process.platform === 'linux') {
	app.commandLine.appendSwitch('ozone-platform', 'x11');
}

if (process.platform === 'win32') {
	app.setAppUserModelId('com.ovfteam.vai-lon-ds');
}

const createWindow = () => {
	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		minWidth: 1280,
		minHeight: 720,
		autoHideMenuBar: true,
		icon: ICON_PATH,
		webPreferences: {
			...BASE_WEB_PREFERENCES,
			autoplayPolicy: 'no-user-gesture-required',
			devTools: false,
		},
	});

	win.webContents.setWindowOpenHandler(({ url }) => {
		try {
			if (new URL(url).hostname === 'accounts.google.com') {
				return {
					action: 'allow',
					overrideBrowserWindowOptions: {
						autoHideMenuBar: true,
						icon: ICON_PATH,
						parent: win,
						webPreferences: { ...BASE_WEB_PREFERENCES },
					},
				};
			}
		} catch {}
		void shell.openExternal(url);
		return { action: 'deny' };
	});
	win.loadURL('https://deadshot.io');
};

app.whenReady().then(() => {
	protocol.handle('https', async (request) => {
		const url = new URL(request.url);

		// For overridden responses we still redeem the real HTTPS request first,
		// so the CDN/matchmaker sees the client fetch the current build; only the
		// bytes handed to the renderer are replaced with the local patched copy.
		const override = url.hostname === 'deadshot.io'
			? (p => p === '/' ? 'index.html'
				: p === '/final.pkg' ? 'final.pkg'
				: p === '/final_legacy.pkg' ? 'final_legacy.pkg'
				: null)(decodeURIComponent(url.pathname))
			: null;
		if (override) {
			const filePath = path.join(ASSETS_DIR, override);
			if (!(await stat(filePath)).isFile()) throw new Error(`Missing override: ${filePath}`);
			let upstream;
			try {
				upstream = await net.fetch(request.url, { bypassCustomProtocolHandlers: true });
				await upstream.arrayBuffer();
			} catch (error) {
				console.error('upstream fetch failed', request.url, error?.message);
			}
			const local = await net.fetch(pathToFileURL(filePath).toString());
			const headers = new Headers(upstream?.headers ?? local.headers);
			headers.delete('content-length');
			headers.delete('content-encoding');
			return new Response(local.body, {
				status: upstream?.status ?? 200,
				headers,
			});
		}

		return net.fetch(request, { bypassCustomProtocolHandlers: true });
	});

	session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
		const ua = details.requestHeaders['User-Agent'];
		if (!ua) {
			callback({ requestHeaders: details.requestHeaders });
			return;
		}
		callback({
			requestHeaders: {
				...details.requestHeaders,
				'User-Agent': ua.replace(/Electron\/[^\s]+/g, '').trim(),
			},
		});
	});

	createWindow();

	setImmediate(async () => {
		try {
			const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
			blocker.enableBlockingInSession(session.defaultSession);
		} catch (error) {
			console.error('err adblock', error);
		}
	});

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	app.quit();
});
