import React from 'react';
import { Pagination, PaginationItem, PaginationFirst, PaginationPrev, PaginationNext, PaginationLast } from '../../ui/pagination';
import { Card, CardBody } from '../../ui/card';
import { Button } from '../../ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../ui/dropdown-menu';
import { LanguageProvider } from '../../../core/language-provider';
import Icon from '../../BodyElements/Icon';


export default function PaginationBlock({ page, totalPages, limit, setLimit, changePage }) {

    function goToPrevPage() {
        if (page > 1) {
            changePage(page - 1)
        }
    }
    function goToNextPage() {
        if (page < totalPages) {
            changePage(page + 1)
        }
    }
    function goToFirstPage() {
        if (page !== 1) {
            changePage(1)
        }
    }
    function goToLastPage() {
        if (page !== totalPages) {
            changePage(totalPages)
        }
    }


    return (
        <div className="mt-4 w-full">
            <Card>
                <CardBody className="p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <Pagination>
                            <PaginationFirst disabled={page <= 1} onClick={goToFirstPage} />
                            <PaginationPrev disabled={page <= 1} onClick={goToPrevPage} />
                            <PaginationItem>
                                {page} <span className='ms-1 text-sm text-muted-foreground'>{LanguageProvider.get('defaults.of')} {totalPages}</span>
                            </PaginationItem>
                            <PaginationNext disabled={page >= totalPages} onClick={goToNextPage} />
                            <PaginationLast disabled={page >= totalPages} onClick={goToLastPage} />
                        </Pagination>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline-secondary" id="dropdown-resultPerPage">
                                    {LanguageProvider.get('defaults.results_per_page')}: {limit} <Icon name="chevron-down" style={{ fontSize: 10 }} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-sm" onClick={() => setLimit(10)}>10</DropdownMenuItem>
                                <DropdownMenuItem className="text-sm" onClick={() => setLimit(20)}>20</DropdownMenuItem>
                                <DropdownMenuItem className="text-sm" onClick={() => setLimit(50)}>50</DropdownMenuItem>
                                <DropdownMenuItem className="text-sm" onClick={() => setLimit(100)}>100</DropdownMenuItem>
                                <DropdownMenuItem className="text-sm" onClick={() => setLimit(200)}>200</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};
