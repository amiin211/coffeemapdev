'use client';

import { AppBar, Toolbar, Box, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TranslateIcon from '@mui/icons-material/Translate';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bi, switchLocalePath, useI18n } from '@/i18n';

const NAV_ITEMS: { label: Bi; href: string }[] = [
  { label: { en: 'Home', ar: 'الرئيسية' }, href: '/' },
  { label: { en: 'About', ar: 'نبذة' }, href: '/about' },
  { label: { en: 'Expertise', ar: 'الخبرات' }, href: '/#capabilities' },
  { label: { en: 'Contact', ar: 'تواصل' }, href: '/#contact' },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAr, pick, href } = useI18n();
  const pathname = usePathname() ?? '/';
  const navItems = NAV_ITEMS.map((item) => ({ label: pick(item.label), href: href(item.href) }));
  // A full page load, so the document switches language and direction cleanly.
  const otherLanguage = { href: switchLocalePath(pathname, isAr ? 'en' : 'ar'), label: isAr ? 'English' : 'العربية', lang: isAr ? 'en' : 'ar' };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center', py: 2 }}>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              sx={{ textAlign: 'center' }}
            >
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontFamily: 'Roboto, sans-serif',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton component="a" href={otherLanguage.href} lang={otherLanguage.lang} sx={{ textAlign: 'center' }}>
            <ListItemText primary={otherLanguage.label} primaryTypographyProps={{ fontWeight: 700 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          maxWidth: 1400,
          width: '100%',
          mx: 'auto',
          px: { xs: 2, md: 4 },
        }}
      >
        <Box
          component={Link}
          href={href('/')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          <Box
            component="img"
            src="/logo.svg"
            alt="CoffeeMap.dev"
            sx={{ height: 40 }}
          />
        </Box>

        {isMobile ? (
          <IconButton
            aria-label={isAr ? 'فتح القائمة' : 'open drawer'}
            edge="end"
            onClick={handleDrawerToggle}
            sx={{ color: 'primary.main' }}
          >
            <MenuIcon />
          </IconButton>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.label}
                component={Link}
                href={item.href}
                sx={{
                  color: 'text.primary',
                  fontFamily: 'Roboto, sans-serif',
                  fontSize: '0.875rem',
                  '&:hover': {
                    backgroundColor: 'rgba(74, 55, 40, 0.08)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
            <Button
              component="a"
              href={otherLanguage.href}
              lang={otherLanguage.lang}
              variant="outlined"
              size="small"
              startIcon={<TranslateIcon sx={{ fontSize: '18px !important' }} />}
              sx={{ ml: 1, px: 1.5, py: 0.5, alignSelf: 'center', fontWeight: 700, gap: 0.5 }}
            >
              {otherLanguage.label}
            </Button>
          </Box>
        )}
      </Toolbar>

      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
          },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};

export default Navbar;
