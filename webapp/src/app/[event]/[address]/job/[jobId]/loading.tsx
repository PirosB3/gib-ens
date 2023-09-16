export default function Loading() {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-75">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
        </div>
    )
}