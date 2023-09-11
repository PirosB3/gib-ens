"use client"

import { VoucherAvailabilityResult, VoucherAvailable } from "@/base/types";
import { useDebounce } from "@uidotdev/usehooks"
import { useState } from "react"
import { useMutation, useQuery } from "react-query"

interface RegisterDomainProps {
    address: string;
    event: string;
}

export function RegisterDomain(props: RegisterDomainProps) {
    const [domain, setDomain] = useState("")
    const debouncedDomain = useDebounce(domain, 500);

    const { isLoading, data } = useQuery<VoucherAvailabilityResult>({
        queryKey: ["domainCheck", debouncedDomain, props.event, props.address],
        queryFn: async () => {
            const response = await fetch(`/${props.event}/${props.address}/${debouncedDomain}/check`);
            return response.json();
        },
        enabled: !!debouncedDomain,
    });

    const mutation = useMutation<any, any, VoucherAvailable>({
        mutationKey: ["domainRegister", data, props.event, props.address],
        mutationFn: async (voucherAvailable) => {
            if (!voucherAvailable?.isAvailable) throw new Error("Domain is not available");
            
            const { owner, policyId } = voucherAvailable.voucher;
            const { normalizedDomainName } = voucherAvailable.ens.purchaseInfo;
            const response = await fetch(`/${policyId}/${owner}/${normalizedDomainName}/register`, {
                method: "POST",
            });
        },
    })

    const onFormSubmit = (e: any) => {
        e.preventDefault();
        if (!data?.isAvailable) return;
        mutation.mutate(data);
    }

    const displayName = data?.isAvailable ? data.ens.purchaseInfo.normalizedDomainName : debouncedDomain;
    return (
        <form action="#" method="post">
            <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700">Domain name</label>
                <input disabled={mutation.isLoading} onChange={(e) => setDomain(e.target.value)} type="text" required className="mt-2 p-2 w-full border rounded-md" value={domain} />
            </div>
            {
                data?.isAvailable ? (
                    <button onClick={(e) => onFormSubmit(e)} disabled={data?.isAvailable !== true || mutation.isLoading} type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 mb-2">
                        Register {displayName}.eth
                    </button>
                ): undefined
            }
            <div>
                {isLoading ? <div>⌛️ Loading...</div> : null}
                { data ? <div>{data.isAvailable ? "✅ Available" : "❌ Not available"}</div> : null }
            </div>
        </form>
    )
}