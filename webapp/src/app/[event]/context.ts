import { PublicPolicyConfig } from "@/services/policyService";
import { createContext, useContext } from "react";

export const PublicPolicyContext = createContext<PublicPolicyConfig | undefined>(undefined);

export const useGetPublicPolicyContext = (): PublicPolicyConfig => {
  const context = useContext(PublicPolicyContext);
  if (context === undefined) {
    throw new Error('useGetPublicPolicyContext must be used within a PublicPolicyProvider');
  }
  return context;
};