"use client";

import { VoucherAvailabilityResult, VoucherAvailable } from "@/base/types";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "react-query";
import { useAccount } from "wagmi";
import { redirect } from "next/navigation";
import { DomainRedeemOperation } from "@/base/userOps/base";
import { RedirectType } from "next/dist/client/components/redirect";

interface RegisterDomainProps {
    address: string;
    event: string;
    forceDisabled: boolean;
}

export function RegisterDomain(props: RegisterDomainProps) {
    const [domain, setDomain] = useState("");
    const debouncedDomain = useDebounce(domain, 500);
    const { address, isDisconnected } = useAccount();

    // Handle redirects
    useEffect(() => {
        handleRedirects();
    }, [props.event, address, isDisconnected]);

    const handleRedirects = () => {
        if (isDisconnected) {
            redirect(`/${props.event}`);
        }

        if (!address) return;
        if (address.toLowerCase() !== props.address.toLowerCase()) {
            redirect(`/${props.event}/${address}`);
        }
    };

    const fetchURL = (endpoint: string) => `/${props.event}/${props.address}/${endpoint}`;

    const { isLoading, data } = useQuery<VoucherAvailabilityResult>({
        queryKey: ["domainCheck", debouncedDomain, props.event, props.address],
        queryFn: async () => {
            const response = await fetch(fetchURL(`${debouncedDomain}/check`));
            return response.json();
        },
        enabled: !!debouncedDomain,
    });

    const mutation = useMutation<DomainRedeemOperation, any, VoucherAvailable>({
        mutationKey: ["domainRegister", data, props.event, props.address],
        mutationFn: async (voucherAvailable) => {
            if (!voucherAvailable?.isAvailable) throw new Error("Domain is not available");

            const { normalizedDomainName } = voucherAvailable.ens.purchaseInfo;
            const response = await fetch(fetchURL(`${normalizedDomainName}/register`), {
                method: "POST",
            });
            return response.json();
        },
    });

    useEffect(() => {
        if (!mutation.isSuccess) return;
        redirect(`/${props.event}/${props.address}/job/${mutation.data.id}`, RedirectType.replace);
    }, [mutation.isSuccess]);

    const onFormSubmit = (e: any) => {
        e.preventDefault();
        if (data?.isAvailable) {
            mutation.mutate(data);
        }
    };

    const displayName = data?.isAvailable ? data.ens.purchaseInfo.normalizedDomainName : debouncedDomain;
    const buttonDisabled = !data?.isAvailable || mutation.isLoading || props.forceDisabled;
    return (
        <form action="#" method="post">
            <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700">Domain name</label>
                <input
                    disabled={mutation.isLoading}
                    onChange={(e) => setDomain(e.target.value)}
                    type="text"
                    required
                    className="mt-2 p-2 w-full border rounded-md"
                    value={domain}
                />
            </div>
            {
                data?.isAvailable && (
                    <button
                        onClick={onFormSubmit}
                        disabled={buttonDisabled}
                        type="submit"
                        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 my-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Register {displayName}.eth
                    </button>
                )
            }
            <div>
                {isLoading && <div>⌛️ Loading...</div>}
                {data && <div>{data.isAvailable ? "✅ Available" : "❌ Not available"}</div>}
            </div>
        </form>
    );
}
