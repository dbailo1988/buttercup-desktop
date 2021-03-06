import { app, shell, Menu } from 'electron';
import { isOSX, isWindows } from '../shared/utils/platform';
import {
  getCurrentArchiveId,
  getAllArchives,
  getSetting
} from '../shared/selectors';
import { setSetting } from '../shared/actions/settings';
import { ImportTypeInfo } from '../shared/buttercup/types';
import { openFile, openFileForImporting, newFile } from './lib/files';
import { getWindowManager } from './lib/window-manager';
import { checkForUpdates } from './lib/updater';
import { getMainWindow } from './utils/window';
import i18n from '../shared/i18n';
import pkg from '../../package.json';

export function setupMenu(store) {
  const defaultTemplate = [
    {
      label: isOSX() ? 'Archive' : 'File',
      submenu: [
        {
          label: i18n.formatMessage({
            id: 'new-archive',
            defaultMessage: 'New Archive'
          }),
          accelerator: 'CmdOrCtrl+N',
          click: (item, focusedWindow) => newFile(focusedWindow)
        },
        {
          label: i18n.formatMessage({
            id: 'open-archive',
            defaultMessage: 'Open Archive'
          }),
          accelerator: 'CmdOrCtrl+O',
          click: (item, focusedWindow) => openFile(focusedWindow)
        },
        {
          label: i18n.formatMessage({
            id: 'connect-cloud-sources',
            defaultMessage: 'Connect Cloud Sources'
          }),
          accelerator: 'CmdOrCtrl+Shift+C',
          click: (item, focusedWindow) => {
            getWindowManager().buildWindowOfType('file-manager', null, {
              parent: getMainWindow(focusedWindow)
            });
          }
        },
        {
          type: 'separator'
        },
        {}, // Import menu will be injected here
        {
          type: 'separator'
        },
        {
          role: 'close'
        }
      ]
    },
    {
      label: i18n.formatMessage({
        id: 'edit',
        defaultMessage: 'Edit'
      }),
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteandmatchstyle' },
        { role: 'delete' },
        { role: 'selectall' }
      ]
    },
    {
      label: i18n.formatMessage({
        id: 'view',
        defaultMessage: 'View'
      }),
      submenu: [
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: i18n.formatMessage({
        id: 'window',
        defaultMessage: 'Window'
      }),
      role: 'window',
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    },
    {
      label: i18n.formatMessage({
        id: 'help',
        defaultMessage: 'Help'
      }),
      role: 'help',
      submenu: [
        {
          label: i18n.formatMessage({
            id: 'visit-our-website',
            defaultMessage: 'Visit Our Website'
          }),
          click: () => {
            shell.openExternal('https://buttercup.pw');
          }
        },
        {
          label: i18n.formatMessage({
            id: 'privacy-policy',
            defaultMessage: 'Privacy Policy'
          }),
          click: () => {
            shell.openExternal('https://buttercup.pw/privacy');
          }
        },
        {
          label: i18n.formatMessage({
            id: 'view-changelog-for-v',
            defaultMessage: 'View Changelog For v{version}',
            values: {
              version: pkg.version
            }
          }),
          click: () => {
            shell.openExternal(
              `https://github.com/buttercup/buttercup/releases/tag/v${pkg.version}`
            );
          }
        }
      ]
    }
  ];

  if (isOSX()) {
    defaultTemplate.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Edit
    defaultTemplate[2].submenu.push(
      { type: 'separator' },
      {
        label: i18n.formatMessage({
          id: 'speech',
          defaultMessage: 'Speech'
        }),
        submenu: [{ role: 'startspeaking' }, { role: 'stopspeaking' }]
      }
    );

    // Window
    defaultTemplate[4].submenu.push(
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    );
  }

  // Check for Updates...
  defaultTemplate[isOSX() ? 0 : 4].submenu.splice(isOSX() ? 1 : 0, 0, {
    label: 'Check for Updates...',
    click: () => {
      checkForUpdates();
    }
  });

  const state = store.getState();
  const archives = getAllArchives(state);
  const currentArchiveId = getCurrentArchiveId(state);

  // Default should be safe (always on) in case it isn't set.
  const menubarAutoHideSetting = getSetting(state, 'menubarAutoHide');
  const menubarAutoHide =
    typeof menubarAutoHideSetting === 'boolean'
      ? menubarAutoHideSetting
      : false;

  // language support
  const currentLocale = getSetting(state, 'locale');

  // make sure that a language is set
  if (!currentLocale) {
    store.dispatch(setSetting('locale', i18n.getConfig('standardLanguage')));
  }

  const template = defaultTemplate.map((item, i) => {
    // OSX has one more menu item
    const index = isOSX() ? i : i + 1;

    switch (index) {
      // Archive / File Menu:
      case 1:
        return {
          ...item,
          submenu: item.submenu.map((sub, i) => {
            if (i === 4) {
              return {
                label: 'Import',
                submenu: Object.entries(
                  ImportTypeInfo
                ).map(([typeKey, type]) => ({
                  label: `From ${type.name} archive (.${type.extension})`,
                  submenu: archives.map(archive => ({
                    label: `To ${archive.name}`,
                    enabled: archive.status === 'unlocked',
                    click: (item, focusedWindow) =>
                      openFileForImporting(focusedWindow, typeKey, archive.id)
                  }))
                }))
              };
            }
            return sub;
          })
        };
      // View Menu:
      case 3:
        return {
          ...item,
          submenu: [
            {
              label: i18n.formatMessage({
                id: 'condensed-sidebar',
                defaultMessage: 'Condensed Sidebar'
              }),
              type: 'checkbox',
              checked: getSetting(state, 'condencedSidebar'),
              accelerator: 'CmdOrCtrl+Shift+B',
              click: item => {
                store.dispatch(setSetting('condencedSidebar', item.checked));
              }
            },
            { type: 'separator' },
            // Language menu point
            {
              label: i18n.formatMessage({
                id: 'language',
                defaultMessage: 'Language'
              }),
              submenu: i18n.getConfig('availableLanguages').map(lang => ({
                label: lang.name,
                checked: currentLocale === lang.code,
                enabled: currentLocale !== lang.code,
                type: 'checkbox',
                click: () => {
                  store.dispatch(setSetting('locale', lang.code));
                  const win = getMainWindow();
                  if (win) {
                    setupMenu(store);
                    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
                    win.webContents.send('locale-change');
                  }
                }
              }))
            },
            ...(isWindows()
              ? [
                  {
                    label: i18n.formatMessage({
                      id: 'auto-hide-menubar',
                      defaultMessage: 'Auto Hide Menubar'
                    }),
                    type: 'checkbox',
                    checked: menubarAutoHide,
                    click: item => {
                      getMainWindow().setAutoHideMenuBar(item.checked);
                      store.dispatch(
                        setSetting('menubarAutoHide', item.checked)
                      );
                    }
                  }
                ]
              : []),
            ...item.submenu
          ]
        };
      // Window Menu:
      case 4:
        return {
          ...item,
          submenu: [
            ...item.submenu,
            { type: 'separator' },
            ...archives.map((archive, index) => ({
              label: archive.name,
              accelerator: `CmdOrCtrl+${index + 1}`,
              // set type to checkbox because if none of the archives are
              // selected and the type is radio, then always the first item
              // will show as active which is unwanted.
              type: currentArchiveId ? 'radio' : 'checkbox',
              click: () => {
                const win = getMainWindow();
                if (win) {
                  win.webContents.send('set-current-archive', archive.id);
                }
              },
              checked: archive.id === currentArchiveId
            }))
          ]
        };
    }

    return item;
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
