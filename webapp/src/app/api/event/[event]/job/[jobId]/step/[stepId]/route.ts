import { getOperatorFromJobId } from "@/base/userOps/base";
import { ServiceFactory } from "@/services/serviceFactory";
import { notFound } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

interface Props {
    params: {
        jobId: string,
        stepId: string,
        event: string,
    }
} 

export async function GET(_request: NextRequest, { params }: Props): Promise<NextResponse> {
    const services = new ServiceFactory(params.event);
    const redeemService = await services.getRedeemService();
    const redeem = await redeemService.getRedeemById(params.jobId);
    if (!redeem) {
        return notFound();
    }

    const operator = await getOperatorFromJobId(services, redeem, params.stepId);
    if (!operator) {
        return notFound();
    }

    const status = await operator.getStatus(redeem, params.stepId);
    return NextResponse.json(status)
}