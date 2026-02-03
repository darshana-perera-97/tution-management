import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for pagination
 * @param {Array} data - The data array to paginate
 * @param {Object} options - Pagination options
 * @param {number} options.itemsPerPageDesktop - Items per page on desktop (default: 10)
 * @param {number} options.itemsPerPageMobile - Items per page on mobile (default: 5)
 * @returns {Object} Pagination state and functions
 */
export const usePagination = (data = [], options = {}) => {
  const {
    itemsPerPageDesktop = 10,
    itemsPerPageMobile = 5
  } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? itemsPerPageMobile : itemsPerPageDesktop;

  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    startIndex: (currentPage - 1) * itemsPerPage,
    endIndex: Math.min(currentPage * itemsPerPage, data.length),
    totalItems: data.length
  };
};


