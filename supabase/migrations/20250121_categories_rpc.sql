-- Create a function to get categories with their asset counts
CREATE OR REPLACE FUNCTION get_categories_with_counts()
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    color TEXT,
    icon TEXT,
    sort_order INTEGER,
    asset_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.color,
        c.icon,
        c.sort_order,
        COUNT(ac.asset_id)::BIGINT as asset_count
    FROM 
        categories c
    LEFT JOIN 
        asset_categories ac ON c.id = ac.category_id
    GROUP BY 
        c.id, c.name, c.slug, c.description, c.color, c.icon, c.sort_order
    ORDER BY 
        c.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
