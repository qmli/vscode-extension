import { defineStore } from 'pinia';

const globalStore = defineStore('globalStore', {
  state: () => {
    return { version: '1.0', theme: 'light', isDark: false };
  },
  actions: {
    setVersion: function (version: string) {
      this.version = version;
    },
    setTheme: function (theme: string) {
      this.theme = theme;
      this.isDark = theme === 'dark';
    }
  }
});

const loadingStore = defineStore('loadingStore', {
  state: () => {
    return { loading: true, readonly: false };
  },
  actions: {
    create: function (state: boolean) {
      this.readonly = state;
    },
    hide: function () {
      this.loading = false;
    },
    show: function () {
      this.loading = true;
    },
    toggle: function () {
      this.loading = !this.loading;
    }
  }
});

const templatePopoverStore = defineStore('templatePopoverStore', {
  state: () => ({
    show: false,
    tempId: '',
    nodeId: '',
    outline: '',
    initValue: [] as any[],
    position: { x: 0, y: 0 }
  }),
  actions: {
    showPopover: function (data: Record<string, any>) {
      if (Object.prototype.hasOwnProperty.call(data, 'show')) {
        this.show = data.show;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'tempId')) {
        this.tempId = data.tempId;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'nodeId')) {
        this.nodeId = data.nodeId;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'outline')) {
        this.outline = data.outline;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'initValue')) {
        this.initValue = data.initValue || [];
      }
      if (Object.prototype.hasOwnProperty.call(data, 'position')) {
        this.position = data.position;
      }
    },
    hidePopover: function () {
      this.show = false;
      this.tempId = '';
      this.nodeId = '';
      this.outline = '';
      this.initValue = [];
      this.position = { x: 0, y: 0 };
    }
  }
});

const contextmenuPopoverStore = defineStore('contextmenuPopoverStore', {
  state: () => ({
    contextData: new Map<string, { show: boolean; evt: any; position?: any; nodeId?: string }>()
  }),
  actions: {
    showPopover: function (id: string, data: { show: boolean; evt: unknown; position: unknown; id: string }) {
      this.contextData.set(id, { show: data.show, evt: data.evt, position: data.position, nodeId: data.id });
    },
    hidePopover: function (id: string) {
      this.contextData.set(id, { show: false, evt: undefined });
    },
    remove: function (id: string) {
      this.contextData.delete(id);
    }
  }
});

const designerGlobalStore = defineStore('designerStore', {
  state: () => ({
    cacheData: new Map<string, any>()
  }),
  actions: {
    setData: function <T>(id: string, data: T) {
      this.cacheData.set(id, data);
    }
  }
});

export { contextmenuPopoverStore, designerGlobalStore, globalStore, loadingStore, templatePopoverStore };
