import { enforceWhitelist } from "@/alchemyService";
import { getENSService } from "@/ensService";
import { getPolicySettingOrRedirect } from "@/policyService";
import { getEthersProvider } from "@/providerService";
import { VoucherService } from "@/voucherService";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    params: {
        event: string,
        address: string,
        domain: string
    }
}

export async function POST(request: NextRequest, props: Props) {
    const config = getPolicySettingOrRedirect(props.params.event);
    await enforceWhitelist(config, props.params.address);

    const ens = await getENSService(config)
    const voucher = await VoucherService.fromEnsService(ens);
    const availability = await voucher.getDomainAvailability({
        domain: props.params.domain,
        owner: props.params.address,
        policyId: config.policyId,
    });
    if (!availability.isAvailable) {
        return new NextResponse(JSON.stringify(availability), {
            status: 404,
        });
    }

    await voucher.createTransactions({
        domain: availability.purchaseInfo.normalizedDomainName,
        owner: props.params.address,
        policyId: config.policyId,
    }, availability)

    return NextResponse.json({
        ok: true,
    })
}
