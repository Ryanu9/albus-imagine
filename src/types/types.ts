import { ImageManagerSettings } from "./image-manager.types";
import { ModifierHotkey, MODIFIER_HOTKEYS } from "../views/ImageViewerConstants";

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

/**
 * 图片查看器设置接口
 */
export interface ImageViewerSettings {
	/** 是否在编辑器中查看图片 */
	viewImageInEditor: boolean;
	/** 是否在社区插件浏览器中查看图片 */
	viewImageInCPB: boolean;
	/** 是否查看带链接的图片 */
	viewImageWithLink: boolean;
	/** 是否在其他位置查看图片 */
	viewImageOther: boolean;
}

export interface IPluginSettings {
	imageManager?: ImageManagerSettings;
	imageResize?: ImageResizeSettings;
	imageViewer?: ImageViewerSettings;
}

export const DEFAULT_IMAGE_RESIZE_SETTINGS: ImageResizeSettings = {
	resizeInterval: 0,
	edgeSize: 20,
	dragResize: true,
};

export const DEFAULT_IMAGE_VIEWER_SETTINGS: ImageViewerSettings = {
	viewImageInEditor: true,
	viewImageInCPB: true,
	viewImageWithLink: true,
	viewImageOther: true,
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
	imageViewer: DEFAULT_IMAGE_VIEWER_SETTINGS,
};
