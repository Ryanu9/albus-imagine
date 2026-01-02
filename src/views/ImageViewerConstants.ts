/**
 * 图片查看器相关常量
 */

export const IMAGE_VIEWER_CLASS = {
	CONTAINER: 'afm-img-viewer-container',
	IMG_CONTAINER: 'afm-img-container',
	IMG_VIEW: 'afm-img-view',
};

/**
 * 修饰键类型
 */
export const MODIFIER_HOTKEYS = {
	NONE: "NONE",
	CTRL: "CTRL",
	ALT: "ALT",
	SHIFT: "SHIFT",
	CTRL_ALT: "CTRL_ALT",
	CTRL_SHIFT: "CTRL_SHIFT",
	SHIFT_ALT: "SHIFT_ALT",
	CTRL_SHIFT_ALT: "CTRL_SHIFT_ALT"
} as const;

export type ModifierHotkey = typeof MODIFIER_HOTKEYS[keyof typeof MODIFIER_HOTKEYS];

/**
 * 图片选择器
 */
export const VIEW_IMG_SELECTOR = {
	EDITOR_AREAS: `.workspace-leaf-content[data-type='markdown'] img,.workspace-leaf-content[data-type='image'] img`,
	EDITOR_AREAS_NO_LINK: `.workspace-leaf-content[data-type='markdown'] img:not(a img),.workspace-leaf-content[data-type='image'] img:not(a img)`,
	CPB: `.community-modal-details img`,
	CPB_NO_LINK: `.community-modal-details img:not(a img)`,
	OTHER: `.modal-content img`,
	OTHER_NO_LINK: `.modal-content img:not(a img)`,
};
