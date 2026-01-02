/**
 * 图片调整大小设置组件
 */

import { usePluginSettings } from "@src/hook/usePluginSettings";
import { Setting, SettingSwitch, SettingTitle, SettingDescription } from "./Settings";
import { DEFAULT_IMAGE_RESIZE_SETTINGS } from "@src/types/types";
import { Notice } from "obsidian";

export function ImageResizeSettings() {
	const { pluginSettings, updatePluginSettings } = usePluginSettings();
	const imageResize = pluginSettings.imageResize || DEFAULT_IMAGE_RESIZE_SETTINGS;

	const updateImageResizeSettings = (updates: Partial<typeof imageResize>) => {
		updatePluginSettings({
			...pluginSettings,
			imageResize: {
				...imageResize,
				...updates,
			},
		});
	};

	return (
		<>
			<SettingTitle>图片调整大小</SettingTitle>
			<SettingDescription>
				通过拖拽图片右下角来调整图片大小，支持内部和外部链接图片
			</SettingDescription>

			<SettingSwitch
				label="启用拖拽调整大小"
				description="是否允许通过拖拽图片边缘来调整图片大小"
				checked={imageResize.dragResize}
				onChange={(checked) =>
					updateImageResizeSettings({ dragResize: checked })
				}
			/>

			<Setting label="调整大小的时间间隔">
				<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
					<input
						type="number"
						min="0"
						step="1"
						value={imageResize.resizeInterval}
						onChange={(e) => {
							const value = e.target.value;
							if (value === '') {
								updateImageResizeSettings({ resizeInterval: 0 });
							} else if (/^\d+$/.test(value) && Number(value) >= 0) {
								updateImageResizeSettings({ resizeInterval: parseInt(value) });
							} else {
								new Notice('请输入非负整数');
								e.target.value = imageResize.resizeInterval.toString();
							}
						}}
						style={{
							width: "100%",
							padding: "6px 12px",
							background: "var(--background-primary)",
							color: "var(--text-normal)",
							border: "1px solid var(--background-modifier-border)",
							borderRadius: "4px",
							fontSize: "13px",
						}}
					/>
					<div style={{
						fontSize: "0.875rem",
						color: "var(--text-muted)",
					}}>
						拖动调整最小刻度（默认值为 0 即不对齐刻度）
					</div>
				</div>
			</Setting>

			<Setting label="边缘检测区域大小">
				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<input
							type="range"
							min="5"
							max="150"
							step="1"
							value={imageResize.edgeSize}
							onChange={(e) =>
								updateImageResizeSettings({ edgeSize: parseInt(e.target.value) })
							}
							style={{
								flex: 1,
								cursor: "pointer",
							}}
						/>
						<span style={{
							minWidth: "50px",
							textAlign: "right",
							fontSize: "0.9rem",
							color: "var(--text-normal)",
							fontWeight: 500,
						}}>
							{imageResize.edgeSize} px
						</span>
					</div>
					<div style={{
						fontSize: "0.875rem",
						color: "var(--text-muted)",
					}}>
						鼠标在图片边缘多少像素内可以触发调整大小
					</div>
				</div>
			</Setting>
		</>
	);
}
