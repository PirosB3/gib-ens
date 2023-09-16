import { ENSService } from "@/services/ensService";
import { getPolicySettingOr404 } from "@/services/policyService";
import { getEthersProvider } from "@/services/providerService";
import { VoucherService } from "@/services/voucherService";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    params: {
        event: string,
        address: string,
        domain: string
    }
}

export async function GET(_request: NextRequest, props: Props) {
    const config = getPolicySettingOr404(props.params.event);
    const ens = await ENSService.fromProvider(getEthersProvider(config), config);
    const voucher = await new VoucherService(ens);
    const availability = await voucher.getDomainAvailability({
        domain: props.params.domain,
        owner: props.params.address,
        policyId: config.policyId,
    });
    return NextResponse.json(availability)
}
