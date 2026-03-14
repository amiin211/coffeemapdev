'use client';

import { useState, useEffect } from 'react';
import { Box, Container, Grid, Typography, Paper, CircularProgress } from '@mui/material';
import { default as nextDynamic } from 'next/dynamic';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from '@/components/DashboardHeader';
import StatCards from '@/components/StatCards';

const FloodMap = nextDynamic(() => import('@/components/FloodMap'), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 400 }}>Loading map...</Paper>
});
const DataPanel = nextDynamic(() => import('@/components/DataPanel'), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 300 }}>Loading...</Paper>
});
const TopStatesBarChart = nextDynamic(() => import('@/components/Charts').then(mod => ({ default: mod.TopStatesBarChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 200 }}>Loading...</Paper>
});
const HousingPieChart = nextDynamic(() => import('@/components/Charts').then(mod => ({ default: mod.HousingPieChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 200 }}>Loading...</Paper>
});
const AffectedBubbleChart = nextDynamic(() => import('@/components/Charts').then(mod => ({ default: mod.AffectedBubbleChart })), {
  ssr: false,
  loading: () => <Paper sx={{ p: 2, height: 200 }}>Loading...</Paper>
});

interface FloodSummary {
  source: string;
  author: string;
  date: string;
  total_affected: number;
  displaced: number;
  deaths: number;
  homes_destroyed: number;
  homes_damaged: number;
}

interface StateData {
  name: string;
  arabic_name: string;
  pcode: string;
  affected: number | null;
  deaths: number | null;
  injured?: number | null;
  homes_destroyed: number | null;
  homes_damaged: number | null;
  lat: number;
  lon: number;
  has_data: boolean;
}

interface LocalityData {
  name: string;
  state: string;
  state_pcode: string;
  lat: number;
  lon: number;
  affected: number | null;
}

interface CholeraData {
  name: string;
  cases: number;
  lat: number;
  lon: number;
}

const defaultSummary: FloodSummary = {
  source: 'OCHA Sudan Flash Update No. 04 (5 September 2024)',
  author: 'Amin Adnan Gasim',
  date: '2024-09-05',
  total_affected: 491100,
  displaced: 143200,
  deaths: 69,
  homes_destroyed: 35518,
  homes_damaged: 44993,
};

const defaultStates: StateData[] = [
  { name: 'North Darfur', arabic_name: 'شمال دارفور', pcode: 'SD02', affected: 122680, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 15.91233495, lon: 25.49878428, has_data: true },
  { name: 'Red Sea', arabic_name: 'البحر الأحمر', pcode: 'SD10', affected: 75118, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 20.0739474, lon: 35.41261521, has_data: true },
  { name: 'Northern', arabic_name: 'الشمالية', pcode: 'SD17', affected: 68164, deaths: 21, injured: 103, homes_destroyed: 4755, homes_damaged: 8280, lat: 19.36562691, lon: 29.89554898, has_data: true },
  { name: 'South Darfur', arabic_name: 'جنوب دارفور', pcode: 'SD03', affected: 62130, deaths: null, homes_destroyed: 1311, homes_damaged: 9402, lat: 10.8859108, lon: 24.31318019, has_data: true },
  { name: 'River Nile', arabic_name: 'نهر النيل', pcode: 'SD16', affected: 58825, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 18.83467686, lon: 33.12314746, has_data: true },
  { name: 'Kassala', arabic_name: 'كسلا', pcode: 'SD11', affected: 15100, deaths: 8, injured: 7, homes_destroyed: 664, homes_damaged: 213, lat: 15.71040524, lon: 35.5355862, has_data: true },
  { name: 'Central Darfur', arabic_name: 'وسط دارفور', pcode: 'SD06', affected: 26200, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 12.30838055, lon: 23.23411106, has_data: true },
  { name: 'West Darfur', arabic_name: 'غرب دارفور', pcode: 'SD04', affected: 12000, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 13.50261153, lon: 22.71005876, has_data: true },
  { name: 'Gedaref', arabic_name: 'القضارف', pcode: 'SD12', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 14.21029664, lon: 35.02673717, has_data: false },
  { name: 'Aj Jazirah', arabic_name: 'الجزيرة', pcode: 'SD15', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 14.5116272, lon: 33.28351684, has_data: false },
  { name: 'Khartoum', arabic_name: 'الخرطوم', pcode: 'SD01', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 15.91498652, lon: 33.13522205, has_data: false },
  { name: 'Blue Nile', arabic_name: 'النيل الأزرق', pcode: 'SD08', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 11.02519187, lon: 34.10191244, has_data: false },
  { name: 'Sennar', arabic_name: 'سنار', pcode: 'SD14', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 12.92321074, lon: 34.07481984, has_data: false },
  { name: 'White Nile', arabic_name: 'النيل الأبيض', pcode: 'SD09', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 13.5895081, lon: 32.35210132, has_data: false },
  { name: 'North Kordofan', arabic_name: 'شمال كردفان', pcode: 'SD13', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 14.38938754, lon: 29.43704807, has_data: false },
  { name: 'South Kordofan', arabic_name: 'جنوب كردفان', pcode: 'SD07', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 11.22893046, lon: 30.9139923, has_data: false },
  { name: 'West Kordofan', arabic_name: 'غرب كردفان', pcode: 'SD18', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 11.86855138, lon: 28.22106087, has_data: false },
  { name: 'East Darfur', arabic_name: 'شرق دارفور', pcode: 'SD05', affected: null, deaths: null, homes_destroyed: null, homes_damaged: null, lat: 11.22988573, lon: 26.39722982, has_data: false },
];

const defaultLocalities: LocalityData[] = [
  { name: 'Ad Dabbah', state: 'Northern', state_pcode: 'SD17', lat: 18.05, lon: 30.95, affected: null },
  { name: 'Al Burgaig', state: 'Northern', state_pcode: 'SD17', lat: 18.8, lon: 30.9, affected: null },
  { name: 'Al Golid', state: 'Northern', state_pcode: 'SD17', lat: 18.5, lon: 30.6, affected: null },
  { name: 'Delgo', state: 'Northern', state_pcode: 'SD17', lat: 18.35, lon: 30.55, affected: null },
  { name: 'Dongola', state: 'Northern', state_pcode: 'SD17', lat: 19.17, lon: 30.47, affected: null },
  { name: 'Halfa', state: 'Northern', state_pcode: 'SD17', lat: 17.6, lon: 33.8, affected: null },
  { name: 'Merowe', state: 'Northern', state_pcode: 'SD17', lat: 18.45, lon: 31.85, affected: null },
  { name: 'Rehaid Albirdi', state: 'South Darfur', state_pcode: 'SD03', lat: 10.8, lon: 24.2, affected: null },
  { name: 'Ed Al Fursan', state: 'South Darfur', state_pcode: 'SD03', lat: 10.95, lon: 24.85, affected: null },
  { name: 'Tulus', state: 'South Darfur', state_pcode: 'SD03', lat: 10.7, lon: 24.5, affected: null },
  { name: 'Buram', state: 'South Darfur', state_pcode: 'SD03', lat: 10.4, lon: 24.15, affected: null },
  { name: 'Katila', state: 'South Darfur', state_pcode: 'SD03', lat: 11.2, lon: 24.3, affected: null },
  { name: 'As Sunta', state: 'South Darfur', state_pcode: 'SD03', lat: 11.0, lon: 23.9, affected: null },
  { name: 'Halfa Aj Jadeedah', state: 'Kassala', state_pcode: 'SD11', lat: 16.0, lon: 35.7, affected: null },
  { name: 'Madeinat Kassala', state: 'Kassala', state_pcode: 'SD11', lat: 15.45, lon: 36.4, affected: null },
  { name: 'Reifi Aroma', state: 'Kassala', state_pcode: 'SD11', lat: 15.9, lon: 36.0, affected: null },
  { name: 'Reifi Gharb Kassala', state: 'Kassala', state_pcode: 'SD11', lat: 15.4, lon: 36.3, affected: null },
  { name: 'Reifi Kassala', state: 'Kassala', state_pcode: 'SD11', lat: 15.5, lon: 36.4, affected: null },
  { name: 'Reifi Khashm Elgirba', state: 'Kassala', state_pcode: 'SD11', lat: 15.1, lon: 36.0, affected: null },
  { name: 'Aroma', state: 'Kassala', state_pcode: 'SD11', lat: 15.75, lon: 35.9, affected: null },
  { name: 'North Delta', state: 'Kassala', state_pcode: 'SD11', lat: 15.8, lon: 35.6, affected: 9500 },
  { name: 'Kutum', state: 'North Darfur', state_pcode: 'SD02', lat: 14.2, lon: 26.1, affected: 42600 },
  { name: 'Tawila', state: 'North Darfur', state_pcode: 'SD02', lat: 13.9, lon: 26.3, affected: 42600 },
  { name: 'Al Fasher', state: 'North Darfur', state_pcode: 'SD02', lat: 13.62, lon: 25.35, affected: 24600 },
  { name: 'Azum', state: 'Central Darfur', state_pcode: 'SD06', lat: 12.5, lon: 23.5, affected: null },
  { name: 'Bendasi', state: 'Central Darfur', state_pcode: 'SD06', lat: 12.2, lon: 23.2, affected: null },
  { name: 'Wadi Salih', state: 'Central Darfur', state_pcode: 'SD06', lat: 12.1, lon: 23.0, affected: null },
  { name: 'Zalingei', state: 'Central Darfur', state_pcode: 'SD06', lat: 12.9, lon: 23.5, affected: null },
  { name: 'Ag Geneina', state: 'West Darfur', state_pcode: 'SD04', lat: 13.45, lon: 22.4, affected: null },
  { name: 'Kereneik', state: 'West Darfur', state_pcode: 'SD04', lat: 13.2, lon: 22.2, affected: null },
  { name: 'Sirba', state: 'West Darfur', state_pcode: 'SD04', lat: 13.1, lon: 22.6, affected: null },
];

const defaultCholera: CholeraData[] = [
  { name: 'Kassala', cases: 1703, lat: 15.71040524, lon: 35.5355862 },
  { name: 'Gedaref', cases: 699, lat: 14.21029664, lon: 35.02673717 },
  { name: 'River Nile', cases: 408, lat: 18.83467686, lon: 33.12314746 },
  { name: 'Aj Jazirah', cases: 65, lat: 14.5116272, lon: 33.28351684 },
  { name: 'Khartoum', cases: 20, lat: 15.91498652, lon: 33.13522205 },
];

function DashboardContent() {
  const [summary, setSummary] = useState<FloodSummary>(defaultSummary);
  const [states, setStates] = useState<StateData[]>(defaultStates);
  const [localities, setLocalities] = useState<LocalityData[]>(defaultLocalities);
  const [cholera, setCholera] = useState<CholeraData[]>(defaultCholera);
  const [selectedState, setSelectedState] = useState<StateData | null>(null);
  const [selectedLocalities, setSelectedLocalities] = useState<LocalityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/data/flood_summary.json').then(res => res.json()).catch(() => null),
      fetch('/data/states_flood_data.json').then(res => res.json()).catch(() => null),
      fetch('/data/localities.json').then(res => res.json()).catch(() => null),
      fetch('/data/cholera_data.json').then(res => res.json()).catch(() => null),
    ])
      .then(([summaryData, statesData, localitiesData, choleraData]) => {
        if (summaryData) setSummary(summaryData);
        if (statesData?.states) setStates(statesData.states);
        if (localitiesData?.localities) setLocalities(localitiesData.localities);
        if (choleraData?.states) setCholera(choleraData.states.map((s: any) => ({ name: s.name, cases: s.cases, lat: s.lat, lon: s.lon })));
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
      });
  }, []);

  const handleStateSelect = (state: StateData | null, locs: LocalityData[]) => {
    setSelectedState(state);
    setSelectedLocalities(locs);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <Box sx={{ py: 2, minHeight: '100vh', bgcolor: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ py: 2, minHeight: '100vh', bgcolor: '#fafafa' }}>
        <Container maxWidth="xl">
          <DashboardHeader
            source={summary.source}
            author={summary.author}
            date={summary.date}
          />

          <StatCards
            total_affected={summary.total_affected}
            displaced={summary.displaced}
            deaths={summary.deaths}
            homes_total={summary.homes_destroyed + summary.homes_damaged}
            total_cholera={2895}
            choleraData={cholera.map(c => ({ state: c.name, cases: c.cases }))}
            selectedState={selectedState}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} lg={8}>
              <Paper elevation={2} sx={{ height: 600 }}>
                <FloodMap
                  statesData={states}
                  localitiesData={localities}
                  onStateSelect={handleStateSelect}
                  choleraData={cholera}
                />
              </Paper>
              <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
                <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.8 }}>
                  This dashboard provides a real-time environmental vulnerability assessment for Sudan, tracking the humanitarian impact of flooding across 15 states. Built on Google Earth Engine satellite data and OCHA field reports, it maps flood extent, housing destruction, displacement, and the critical overlap between flooding and famine zones — giving responders and researchers a clear, data-driven picture of where the crisis is most severe.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                  I transformed the OCHA Sudan Flash Update on the humanitarian impact of heavy rains and flooding into an interactive dashboard on <strong>CoffeeMap.dev</strong>, turning a dense situation report into a clearer, more accessible spatial story. The dashboard highlights the scale and geography of the crisis by visualizing affected states and localities, key humanitarian indicators such as people affected, displaced populations, deaths, injuries, destroyed and damaged homes, and the broader public health risks linked to flooding, including the cholera outbreak. By structuring the report into a more intuitive data experience, I demonstrated how geospatial design and dashboard thinking can support faster understanding, better communication, and more informed humanitarian decision-making from complex emergency data.{' '}
                  <a href="https://www.unocha.org/publications/report/sudan/sudan-humanitarian-impact-heavy-rains-and-flooding-flash-update-no-04-5-september-2024" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>
                    Learn more
                  </a>
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <DataPanel
                    state={selectedState}
                    localities={selectedLocalities}
                    choleraData={cholera.map(c => ({ state: c.name, cases: c.cases }))}
                    totalCholeraDeaths={112}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TopStatesBarChart 
                    statesData={states} 
                    localitiesData={localities}
                  />
                </Grid>
                <Grid item xs={12}>
                  <HousingPieChart homesDestroyed={summary.homes_destroyed} homesDamaged={summary.homes_damaged} />
                </Grid>
                <Grid item xs={12}>
                  <AffectedBubbleChart 
                    statesData={states} 
                    localitiesData={localities}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          </Container>
      </Box>
    </AppLayout>
  );
}

export const revalidate = 0;

export default function SudanFloodDashboard() {
  return <DashboardContent />;
}
