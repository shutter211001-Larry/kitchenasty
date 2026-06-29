import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
interface NutritionData {
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  sodium: number;
}
interface Props {
  data: NutritionData;
  title?: string;
}
const NutritionRadar = ({ data, title }: Props) => {
  const { t } = useTranslation();
  // Normalize data for the radar chart (values from 0 to 100 based on some arbitrary benchmark)
  // benchmarks: Calories (2000), Protein (50g), Fat (70g), Carbs (300g), Sodium (2400mg)
  // Let's use a per-portion benchmark or just simple scaling.
  const chartData = [
    {
      subject: t("erp_197"),
      A: Math.min(100, (data.calories / 1000) * 100),
      fullMark: 100,
    },
    {
      subject: t("erp_198"),
      A: Math.min(100, (data.protein / 50) * 100),
      fullMark: 100,
    },
    {
      subject: t("erp_199"),
      A: Math.min(100, (data.fat / 70) * 100),
      fullMark: 100,
    },
    {
      subject: t("erp_200"),
      A: Math.min(100, (data.carbohydrates / 300) * 100),
      fullMark: 100,
    },
    {
      subject: t("erp_201"),
      A: Math.min(100, (data.sodium / 2400) * 100),
      fullMark: 100,
    },
  ];
  return (
    <div className="w-full h-64 bg-white rounded-3xl p-4 flex flex-col items-center">
      {title && (
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
          {title}
        </h4>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "#6b7280",
              fontSize: 10,
              fontWeight: 700,
            }}
          />
          <Radar
            name="Nutrition"
            dataKey="A"
            stroke="#ff4d4d"
            fill="#ff4d4d"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
export default NutritionRadar;
