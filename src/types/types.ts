import { ImageManagerSettings } from "./image-manager.types";

/**
 * 图片调整大小插件的设置接口
 */
export interface ImageResizeSettings {
	/** 调整大小的时间间隔（像素） */
	resizeInterval: number;
	/** 边缘检测区域大小（像素） */
	edgeSize: number;
	/** 是否启用拖拽调整大小 */
	dragResize: boolean;
}

export interface IPluginSettings {
	imageManager?: ImageManagerSettings;
	imageResize?: ImageResizeSettings;
}

export const DEFAULT_IMAGE_RESIZE_SETTINGS: ImageResizeSettings = {
	resizeInterval: 0,
	edgeSize: 20,
	dragResize: true,
};

export const DEFAULT_SETTINGS: IPluginSettings = {
	imageManager: {
		folderPath: "",
		lastSelectedFolder: "",
		showFileSize: true,
		showModifiedTime: true,
		defaultFilterUnreferenced: false,
		confirmDelete: true,
		customFileTypes: [],
		fileOpenModes: {},
	},
	imageResize: DEFAULT_IMAGE_RESIZE_SETTINGS,
};
