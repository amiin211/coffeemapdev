'use client';

import { Box, Container, Typography, Grid, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { techCategories, allTechnologies } from '@/data/techStack';
import { capabilities } from '@/data/capabilities';

interface TechStackProps {
  selectedCategory: string | null;
  selectedTech: string | null;
  onTechClick: (tech: string | null) => void;
  onCategoryClick: (category: string | null) => void;
}

const TechStack = ({ selectedCategory, selectedTech, onTechClick, onCategoryClick }: TechStackProps) => {
  const isTechSelected = (tech: string) => selectedTech === tech;

  const getTechCategory = (tech: string) => {
    for (const cat of techCategories) {
      if (cat.technologies.includes(tech)) return cat.id;
    }
    return null;
  };

  return (
    <Box
      id="techstack"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: 'background.default',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h2"
            sx={{
              fontFamily: 'Fira Code, monospace',
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: 'primary.main',
              mb: 2,
            }}
          >
            Technology Stack
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              fontSize: '1rem',
              lineHeight: 1.7,
            }}
          >
            Tools and frameworks we use to build powerful geospatial solutions
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Fira Code, monospace',
              fontWeight: 600,
              color: 'primary.main',
              mb: 2,
              textAlign: 'center',
            }}
          >
            Filter by Capability
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
            {capabilities.map((cap) => (
              <Chip
                key={cap.id}
                label={cap.title}
                onClick={() => onCategoryClick(selectedCategory === cap.category ? null : cap.category)}
                sx={{
                  backgroundColor: selectedCategory === cap.category ? 'primary.main' : 'background.paper',
                  color: selectedCategory === cap.category ? 'white' : 'text.primary',
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.8rem',
                  border: '1px solid',
                  borderColor: selectedCategory === cap.category ? 'primary.main' : 'divider',
                  '&:hover': {
                    backgroundColor: selectedCategory === cap.category ? 'primary.dark' : 'rgba(74, 55, 40, 0.08)',
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        <Grid container spacing={3}>
          {techCategories.map((category) => (
            <Grid item xs={12} md={6} key={category.id}>
              <Box
                sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    backgroundColor: 'rgba(45, 90, 61, 0.08)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: 'Fira Code, monospace',
                      fontWeight: 600,
                      color: 'secondary.main',
                    }}
                  >
                    {category.name}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {category.technologies.map((tech) => (
                    <Chip
                      key={tech}
                      label={tech}
                      onClick={() => onTechClick(isTechSelected(tech) ? null : tech)}
                      sx={{
                        px: 1,
                        py: 2,
                        backgroundColor: isTechSelected(tech) ? 'secondary.main' : 'transparent',
                        color: isTechSelected(tech) ? 'white' : 'text.primary',
                        fontFamily: 'Fira Code, monospace',
                        fontSize: '0.8rem',
                        border: '1px solid',
                        borderColor: isTechSelected(tech) ? 'secondary.main' : 'divider',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: isTechSelected(tech) ? 'secondary.dark' : 'rgba(45, 90, 61, 0.08)',
                          transform: 'translateY(-2px)',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {(selectedCategory || selectedTech) && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontFamily: 'Fira Code, monospace',
              }}
            >
              Click any chip to clear filter. Filters work together.
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default TechStack;
