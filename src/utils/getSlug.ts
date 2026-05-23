import slugify from "slugify";

export async function generateUniqueSlug(title: string): Promise<string> {
    // Create a base slug from the title
    const fn = (typeof slugify === "function" ? slugify : (slugify as any).default) as (s: string, o: object) => string;
    let newSlug = fn(title, {
        lower: true,
        strict: true,
        trim: true,
    });

    //check if the slug already exists
    // const slugExists = await prisma.event.findUnique({where:{slug:newSlug}});

    // if(slugExists){
    //     const timeStamp = Date.now()
    //     const slugWithTimestamp = `${newSlug}-${timeStamp}`;
    //     return slugWithTimestamp;
    // }

    return newSlug;
}
