import { getOperatorFromJobId } from "@/base/userOps/base";
import { AlchemyGasManagerService } from "@/services/alchemyService";
import { ENSService } from "@/services/ensService";
import { getPolicySetting } from "@/services/policyService";
import { getEthersProvider } from "@/services/providerService";
import { RedeemService } from "@/services/redeemService";
import { ServiceFactory } from "@/services/serviceFactory";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    params: {
        jobId: string,
        stepId: string,
        event: string,
    }
} 

export async function GET(request: NextRequest, { params }: Props): Promise<NextResponse> {
    const services = new ServiceFactory(params.event);
    const redeemService = await services.getRedeemService();
    const redeem = await redeemService.getRedeemById(params.jobId);
    if (!redeem) {
        return new NextResponse('', {
            status: 404,
        })
    }

    const operator = await getOperatorFromJobId(services, redeem, params.stepId);
    if (!operator) {
        return new NextResponse('', {
            status: 404,
        })
    }

    const status = await operator.getStatus(redeem);
    return NextResponse.json(status)
}