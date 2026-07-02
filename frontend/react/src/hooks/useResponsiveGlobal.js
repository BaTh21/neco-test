import { useTheme } from '@mui/material/styles'
import { useMediaQuery } from '@mui/material'
import { useEffect, useState } from 'react'

export default function useResponsiveGlobal() {
  const theme = useTheme()

  // This fixes the issue 100%
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const queries = {
    isMobile: useMediaQuery(theme.breakpoints.down('sm')),
    isTablet: useMediaQuery(theme.breakpoints.between('sm', 'md')),
    isDesktop: useMediaQuery(theme.breakpoints.up('md')),
    isLargeDesktop: useMediaQuery(theme.breakpoints.up('lg')),
    isSmallScreen: useMediaQuery(theme.breakpoints.down('md')),
  }

  // Before mount (SSR or StrictMode), return safe defaults
  if (!isMounted) {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
      isSmallScreen: false,

      dialogMaxWidth: 'sm',
      useDrawerOnMobile: false,
      dataGridHeight: 'calc(100vh - 184px)',
      headerFlexDirection: 'row',
      headerAlignItems: 'center',
      buttonStackDirection: 'row',
      searchWidth: 300,
    }
  }

  // After mount → real values (now correct on 884px, 768px, etc.)
  const { isMobile, isTablet, isDesktop, isLargeDesktop, isSmallScreen } = queries

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isSmallScreen,

    dialogMaxWidth: isMobile ? 'xs' : 'sm',
    useDrawerOnMobile: isMobile,
    dataGridHeight: isMobile
      ? 'calc(100vh - 280px)'
      : isTablet
        ? 'calc(100vh - 240px)'  // better for iPad
        : 'calc(100vh - 184px)',

    headerFlexDirection: isMobile ? 'column' : 'row',
    headerAlignItems: isMobile ? 'flex-start' : 'center',
    buttonStackDirection: isMobile || isTablet ? 'column' : 'row',  // ← important!
    searchWidth: isMobile ? '100%' : isTablet ? 280 : 300,
  }
}