"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Company, Category, CareerFairEvent } from "@/lib/types";
import { mockCompanies, mockEvents } from "@/lib/mockData";
import { companyApi, eventApi } from "@/lib/api-client";

interface CompanyStoreContextType {
  /** All companies (admin-managed career fair list + user-added) */
  careerFairCompanies: Company[];
  addCareerFairCompany: (company: Company) => void;
  updateCareerFairCompany: (id: string, updates: Partial<Company>) => void;
  removeCareerFairCompany: (id: string) => void;
  bulkAddCareerFairCompanies: (companies: Company[]) => void;

  /** Events */
  events: CareerFairEvent[];
  addEvent: (event: CareerFairEvent) => void;
  updateEvent: (id: string, updates: Partial<CareerFairEvent>) => void;
  removeEvent: (id: string) => void;
  addCompanyToEvent: (eventId: string, companyId: string) => void;
  removeCompanyFromEvent: (eventId: string, companyId: string) => void;
  getEventCompanies: (eventId: string) => Company[];
  getEventById: (eventId: string) => CareerFairEvent | undefined;
}

const CompanyStoreContext = createContext<CompanyStoreContextType | undefined>(undefined);

export function CompanyStoreProvider({ children }: { children: React.ReactNode }) {
  const [careerFairCompanies, setCareerFairCompanies] = useState<Company[]>(mockCompanies);
  const [events, setEvents] = useState<CareerFairEvent[]>(mockEvents);

  // Load data from API on mount — fall back to mock data on failure
  useEffect(() => {
    async function loadData() {
      try {
        const [companiesRes, eventsRes] = await Promise.all([
          companyApi.list().catch(() => null),
          eventApi.list().catch(() => null),
        ]);
        if (companiesRes?.companies?.length) {
          setCareerFairCompanies(companiesRes.companies);
        }
        if (eventsRes?.events?.length) {
          setEvents(eventsRes.events);
        }
      } catch {
        // Keep mock data as fallback
      }
    }
    loadData();
  }, []);

  // Company CRUD — optimistic local update + fire-and-forget API sync
  const addCareerFairCompany = useCallback((company: Company) => {
    setCareerFairCompanies((prev) => [...prev, company]);
    companyApi.create(company).catch(() => {});
  }, []);

  const updateCareerFairCompany = useCallback((id: string, updates: Partial<Company>) => {
    setCareerFairCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    companyApi.update(id, updates).catch(() => {});
  }, []);

  const removeCareerFairCompany = useCallback((id: string) => {
    setCareerFairCompanies((prev) => prev.filter((c) => c.id !== id));
    setEvents((prev) =>
      prev.map((e) => ({
        ...e,
        companyIds: e.companyIds.filter((cId) => cId !== id),
      }))
    );
    companyApi.delete(id).catch(() => {});
  }, []);

  const bulkAddCareerFairCompanies = useCallback((companies: Company[]) => {
    setCareerFairCompanies((prev) => [...prev, ...companies]);
    // API sync happens from the calling component that already knows the eventId
  }, []);

  // Event CRUD — optimistic local update + fire-and-forget API sync
  const addEvent = useCallback((event: CareerFairEvent) => {
    setEvents((prev) => [...prev, event]);
    eventApi.create(event).catch(() => {});
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<CareerFairEvent>) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    eventApi.update(id, updates).catch(() => {});
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    eventApi.delete(id).catch(() => {});
  }, []);

  const addCompanyToEvent = useCallback((eventId: string, companyId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId && !e.companyIds.includes(companyId)
          ? { ...e, companyIds: [...e.companyIds, companyId] }
          : e
      )
    );
    eventApi.addCompany(eventId, companyId).catch(() => {});
  }, []);

  const removeCompanyFromEvent = useCallback((eventId: string, companyId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, companyIds: e.companyIds.filter((cId) => cId !== companyId) }
          : e
      )
    );
    eventApi.removeCompany(eventId, companyId).catch(() => {});
  }, []);

  const getEventCompanies = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return [];
      return careerFairCompanies.filter((c) => event.companyIds.includes(c.id));
    },
    [events, careerFairCompanies]
  );

  const getEventById = useCallback(
    (eventId: string) => events.find((e) => e.id === eventId),
    [events]
  );

  return (
    <CompanyStoreContext.Provider
      value={{
        careerFairCompanies,
        addCareerFairCompany,
        updateCareerFairCompany,
        removeCareerFairCompany,
        bulkAddCareerFairCompanies,
        events,
        addEvent,
        updateEvent,
        removeEvent,
        addCompanyToEvent,
        removeCompanyFromEvent,
        getEventCompanies,
        getEventById,
      }}
    >
      {children}
    </CompanyStoreContext.Provider>
  );
}

export function useCompanyStore() {
  const ctx = useContext(CompanyStoreContext);
  if (!ctx) throw new Error("useCompanyStore must be used within CompanyStoreProvider");
  return ctx;
}
