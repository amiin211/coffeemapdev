'use client';

import { AppBar, Toolbar, Box, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import Link from 'next/link';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Expertise', href: '/#capabilities' },
  { label: 'Contact', href: '/#contact' },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
                  fontFamily: 'Fira Code, monospace',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
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
          href="/"
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
            aria-label="open drawer"
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
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.875rem',
                  '&:hover': {
                    backgroundColor: 'rgba(74, 55, 40, 0.08)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
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
