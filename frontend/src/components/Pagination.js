import React from 'react';
import { Pagination as BootstrapPagination } from 'react-bootstrap';
import '../App.css';

const Pagination = ({ currentPage, totalPages, onPageChange, onNext, onPrev, totalItems, startIndex, endIndex }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = window.innerWidth <= 768 ? 3 : 5;
    
    if (totalPages <= maxVisible) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate start and end of visible range
      let start = Math.max(2, currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages - 1, start + maxVisible - 3);
      
      // Adjust if we're near the end
      if (end === totalPages - 1) {
        start = Math.max(2, totalPages - maxVisible + 2);
      }
      
      // Add ellipsis before if needed
      if (start > 2) {
        pages.push('ellipsis-start');
      }
      
      // Add visible page numbers
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis after if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination-container">
      <div className="pagination-info d-none d-md-block">
        Showing {startIndex + 1} to {endIndex} of {totalItems} entries
      </div>
      <BootstrapPagination className="justify-content-center justify-content-md-end mb-0">
        <BootstrapPagination.Prev 
          onClick={onPrev} 
          disabled={currentPage === 1}
          className="pagination-item"
        />
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <BootstrapPagination.Ellipsis key={`ellipsis-${index}`} className="pagination-item" />
            );
          }
          return (
            <BootstrapPagination.Item
              key={page}
              active={page === currentPage}
              onClick={() => onPageChange(page)}
              className="pagination-item"
            >
              {page}
            </BootstrapPagination.Item>
          );
        })}
        <BootstrapPagination.Next 
          onClick={onNext} 
          disabled={currentPage === totalPages}
          className="pagination-item"
        />
      </BootstrapPagination>
    </div>
  );
};

export default Pagination;
















