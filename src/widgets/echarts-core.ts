import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";

echarts.use([CanvasRenderer, TitleComponent, TooltipComponent, LegendComponent, GridComponent]);

export { echarts };
export type { EChartsCoreOption } from "echarts/core";
