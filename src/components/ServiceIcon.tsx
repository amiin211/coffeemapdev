// Icons for the services in src/data/capabilities.ts (by their `icon` key).
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PublicIcon from '@mui/icons-material/Public';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import MapIcon from '@mui/icons-material/Map';

const ICONS = {
  Satellite: SatelliteAltIcon,
  Humanitarian: VolunteerActivismIcon,
  Public: PublicIcon,
  Surveying: SquareFootIcon,
  FactCheck: FactCheckIcon,
  ViewInAr: ViewInArIcon,
};

export default function ServiceIcon({ name, size = 48 }: { name: string; size?: number }) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? MapIcon;
  return <Icon sx={{ fontSize: size }} />;
}
